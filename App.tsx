import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import Navbar from './components/Navbar';
import Header from './components/Header';
import Marquee from './components/Marquee';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ArticlePage from './pages/ArticlePage';

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col font-sans-sc">
          <div className="max-w-[1440px] w-full mx-auto px-[15px]">
            <Header />
          </div>
          
          <Navbar />
          <Marquee />

          <div className="max-w-[1440px] w-full mx-auto px-[15px] flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/article/:id" element={<ArticlePage />} />
            </Routes>
          </div>

          <Footer />
        </div>
      </HashRouter>
    </LanguageProvider>
  );
};

export default App;