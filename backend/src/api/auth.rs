use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;

use crate::config::Settings;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthRequest {
    pub email: String,
    pub password: String,
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResponse {
    pub token: String,
    pub email: String,
    pub name: String,
}

pub struct AuthState {
    pub users: HashMap<String, HashMap<String, String>>,
    pub settings: Settings,
}

impl AuthState {
    pub fn new(settings: Settings) -> Self {
        let mut users = HashMap::new();
        let mut user = HashMap::new();
        user.insert("name".to_string(), "SCAN-01".to_string());
        user.insert("password".to_string(), "aegis".to_string());
        users.insert("operator@aegis.local".to_string(), user);

        Self { users, settings }
    }

    pub fn sign(&self, payload: &str) -> String {
        let mut mac =
            HmacSha256::new_from_slice(self.settings.token_secret.as_bytes()).expect("HMAC key");
        mac.update(payload.as_bytes());
        let result = mac.finalize();
        hex::encode(result.into_bytes())
    }

    pub fn issue_token(&self, email: &str, name: &str) -> String {
        let exp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs_f64()
            + self.settings.token_ttl_seconds as f64;

        let body = serde_json::json!({
            "email": email,
            "name": name,
            "exp": exp,
        })
        .to_string();

        let sig = self.sign(&body);
        let token = format!("{}::{}", body, sig);
        URL_SAFE_NO_PAD.encode(token.as_bytes())
    }

    pub fn decode_token(&self, token: &str) -> Result<HashMap<String, serde_json::Value>, String> {
        let raw = URL_SAFE_NO_PAD
            .decode(token.as_bytes())
            .map_err(|_| "Malformed token".to_string())?;
        let raw = String::from_utf8(raw).map_err(|_| "Invalid UTF-8".to_string())?;
        let (body, sig) = raw
            .rsplit_once("::")
            .ok_or("Malformed token".to_string())?;

        let expected_sig = self.sign(body);
        if !constant_time_eq(&sig.as_bytes(), &expected_sig.as_bytes()) {
            return Err("Invalid token".to_string());
        }

        let data: HashMap<String, serde_json::Value> =
            serde_json::from_str(body).map_err(|_| "Invalid token payload".to_string())?;

        let exp = data
            .get("exp")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs_f64();

        if exp < now {
            return Err("Token expired".to_string());
        }

        Ok(data)
    }

    pub fn register(&mut self, email: &str, password: &str, name: Option<&str>) -> Result<AuthResponse, String> {
        let email_lower = email.to_lowercase();
        if self.users.contains_key(&email_lower) {
            return Err("Operator already enrolled".to_string());
        }
        let name_final = {
            let default_name = email_lower.split('@').next().unwrap_or("OPERATOR");
            let name_input = name.unwrap_or(default_name);
            let name_str = name_input.trim();
            if name_str.is_empty() { "OPERATOR".to_string() } else { name_str.to_string() }
        };
        let mut user = HashMap::new();
        user.insert("name".to_string(), name_final.clone());
        user.insert("password".to_string(), password.to_string());
        self.users.insert(email_lower.clone(), user);

        let token = self.issue_token(&email_lower, &name_final);
        Ok(AuthResponse {
            token,
            email: email_lower,
            name: name_final,
        })
    }

    pub fn login(&self, email: &str, password: &str) -> Result<AuthResponse, String> {
        let email = email.to_lowercase();
        let user = self
            .users
            .get(&email)
            .ok_or("Invalid operator credentials")?;

        let user_password = user
            .get("password")
            .ok_or("Invalid operator credentials")?;
        if user_password != password {
            return Err("Invalid operator credentials".to_string());
        }

        let name = user.get("name").cloned().unwrap_or_default();
        let token = self.issue_token(&email, &name);
        Ok(AuthResponse {
            token,
            email,
            name,
        })
    }
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter().zip(b.iter()).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}
