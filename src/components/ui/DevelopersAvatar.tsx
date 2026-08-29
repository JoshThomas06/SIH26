import React from 'react';

type Profile = {
  name: string;
  src: string | null;
};

const avatars: readonly Profile[] = [
  { src: 'https://github.com/Not-Buddy.png', name: 'Aary Milind Kinge' },
  { src: 'https://github.com/ajaykumarreddy-k.png', name: 'Ajay Kumar Reddy' },
  { src: 'https://github.com/JoshThomas06.png', name: 'Josh Thomas' },
  { src: 'https://github.com/MITIOX.png', name: 'MITIOX' },
  { src: 'https://github.com/orbit-psd2.png', name: 'Orbit PSD2' },
  { src: 'https://github.com/Ridu123456.png', name: 'Ridu123456' },
];

const getInitials = (name: string) =>
  name.split(/\s+/).map((word) => word.slice(0, 1)).join('').toUpperCase().substring(0, 2);

const DevelopersAvatar = () => {
  return (
    <div className="flex flex-col items-center gap-4 mb-16">
      <a href="https://github.com/JoshThomas06/SIH26" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs md:text-sm font-bold tracking-widest uppercase text-[#111] hover:text-black hover:underline mb-2 transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        Visit the project repo: https://github.com/JoshThomas06/SIH26
      </a>
      <h3 className="text-sm font-bold tracking-widest uppercase text-[#111]/50">Developers Behind this project</h3>
      <div className="flex -space-x-3 hover:space-x-1 transition-all duration-300 ease-in-out px-4 py-2">
        {avatars.map((avatar, idx) => (
          <a 
            key={idx} 
            href={avatar.src ? avatar.src.replace('.png', '') : '#'} 
            target={avatar.src ? "_blank" : "_self"}
            rel={avatar.src ? "noopener noreferrer" : ""}
            className="relative group cursor-pointer z-0 hover:z-10 transition-all duration-300"
          >
            {avatar.src ? (
              <img 
                src={avatar.src} 
                alt={avatar.name} 
                className="w-12 h-12 rounded-full border-[3px] border-[#FFE600] object-cover bg-gray-200 shadow-md hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="w-12 h-12 rounded-full border-[3px] border-[#FFE600] bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-700 shadow-md hover:scale-110 transition-transform duration-300">
                {getInitials(avatar.name)}
              </div>
            )}
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-[#111] text-[#FFE600] text-[11px] font-bold uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
              {avatar.name}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default DevelopersAvatar;
