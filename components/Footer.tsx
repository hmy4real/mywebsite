import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="bg-[#BE0000] text-white text-center p-[15px] mt-[30px] font-[Ma_Shan_Zheng] text-[20px] md:text-[28px] tracking-[2px] shadow-lg">
      {t('banner-strip')}
    </div>
  );
};

export default Footer;