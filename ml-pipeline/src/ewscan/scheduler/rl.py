from __future__ import annotations

import numpy as np
import torch

from ewscan.scheduler.base import Scheduler


class SB3PolicyScheduler(Scheduler):
    name = "rl"

    def __init__(self, model):
        self.model = model

    def act(self, obs: np.ndarray, info: dict) -> int:
        action, _ = self.model.predict(obs, deterministic=True)
        return int(action)


class DQNPolicyScheduler(Scheduler):
    name = "rl"

    def __init__(self, model_path: str, device: str = "auto"):
        from ewscan.train.dqn_torch import BandQNet

        ckpt = torch.load(model_path, map_location="cpu", weights_only=False)
        self.n_bands = int(ckpt["n_bands"])
        self.net = BandQNet(self.n_bands, hidden=int(ckpt.get("hidden", 64)))
        self.net.load_state_dict(ckpt["state_dict"])
        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self.net.to(device).eval()
        self._device = device

    def act(self, obs: np.ndarray, info: dict) -> int:
        with torch.no_grad():
            t = torch.as_tensor(obs[None], dtype=torch.float32, device=self._device)
            q = self.net(t)
        return int(q.argmax(dim=1).item())
