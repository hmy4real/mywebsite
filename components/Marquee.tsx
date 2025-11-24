import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Marquee: React.FC = () => {
  const { t } = useLanguage();
  const items = Array.from({ length: 12 }, (_, i) => `marquee${i + 1}`);

  return (
    <div className="bg-[#fff4f4] text-[#BE0000] py-[6px] font-bold overflow-hidden border-b border-[#ffdcdb] relative whitespace-nowrap">
      <div className="inline-block animate-scroll">
        {items.map((key, index) => (
          <span key={key} className="mr-[50px] md:mr-[300px] inline-block">
            ★ {t(key)}
          </span>
        ))}
         {/* Duplicate for seamless loop effect visual padding */}
         {items.map((key, index) => (
          <span key={`dup-${key}`} className="mr-[50px] md:mr-[300px] inline-block">
            ★ {t(key)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Marquee;