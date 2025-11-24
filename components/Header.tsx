import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  const { language, t } = useLanguage();

  return (
    <div className="py-5 border-b-0 flex flex-col md:flex-row items-start md:items-center gap-5">
      <Link to="/" className="flex items-center gap-5 group">
        <img 
          src="https://i.postimg.cc/wvy7YZX0/stevehanlogored.png" 
          alt="Steve Han Youth Vanguard Logo" 
          className="h-[60px] w-auto block"
        />
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-5">
            <h1 
                className={`text-[40px] md:text-[60px] leading-none text-[#BE0000] drop-shadow-[2px_2px_0_rgba(0,0,0,0.1)] transition-all ${language === 'en' ? 'font-serif font-black' : 'font-[Ma_Shan_Zheng] font-normal'}`}
            >
                {t('logo-text')}
            </h1>
            <div className={`text-[#8B0000] text-[15px] md:text-[18px] font-black font-serif border-l-0 md:border-l-2 md:border-[#ccc] md:pl-5 md:min-w-[200px]`}>
                {t('logo-sub')}
            </div>
        </div>
      </Link>
    </div>
  );
};

export default Header;