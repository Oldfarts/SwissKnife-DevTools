// HomePage.tsx
import React from 'react';
import { Language, getText } from './tools';

interface HomePageProps {
  lang: Language;
  onStart: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ lang, onStart }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Hero / Tervetuloa-osio */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-xl">
        <h1 className="text-4xl font-bold text-white mb-4">
          🛠️ SwissKnife DevTools
        </h1>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-6">
          {lang === 'fi' 
            ? 'Monipuolinen sveitsiläinen linkkuveitsi kehittäjille ja ylläpitäjille. Analysoi SSL-sertifikaatteja, DNS-tietoja, JSON/XML-muotoiluja ja paljon muuta.'
            : 'A versatile Swiss Army knife for developers and sysadmins. Analyze SSL certificates, DNS records, format JSON/XML, and much more.'}
        </p>
        <button
          onClick={onStart}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-xl transition duration-200 shadow-lg hover:shadow-blue-500/25 cursor-pointer text-lg"
        >
          {lang === 'fi' ? 'Avaa työkalut 🚀' : 'Open Tools 🚀'}
        </button>
      </div>

      {/* Tietokortit: Tekijä & Lisenssi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tekijätiedot */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 shadow-md">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-2xl">👨‍💻</span>
            <h2 className="text-xl font-bold text-white">
              {lang === 'fi' ? 'Tekijätiedot' : 'Author Info'}
            </h2>
          </div>
          <div className="text-slate-300 space-y-2 text-sm">
            <p><strong>{lang === 'fi' ? 'Kehittäjä' : 'Developer'}:</strong> [Sinun Nimesi / Tiimi]</p>
            <p><strong>GitHub:</strong> <a href="https://github.com/OMANIKKIMERKKI/REPOSITORIO" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">github.com/OMANIKKIMERKKI/REPOSITORIO</a></p>
            <p><strong>{lang === 'fi' ? 'Sähköposti' : 'Email'}:</strong> contact@example.com</p>
          </div>
        </div>

        {/* Lisenssitiedot (GPLv3) */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 shadow-md">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-2xl">📜</span>
            <h2 className="text-xl font-bold text-white">
              {lang === 'fi' ? 'Käyttöoikeudet & Lisenssi' : 'License & Rights'}
            </h2>
          </div>
          <div className="text-slate-300 space-y-3 text-sm">
            <div className="flex items-center space-x-2">
              <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-2.5 py-1 rounded border border-green-500/30">
                GNU GPL v3.0
              </span>
              <span className="text-slate-400 text-xs">{lang === 'fi' ? 'Vapaa ohjelmisto' : 'Open Source'}</span>
            </div>
            <p>
              {lang === 'fi' 
                ? 'Tämä ohjelmisto on lisensoitu vapaalla GNU General Public License v3.0 -lisenssillä. Voit vapaasti käyttää, muokata ja jakaa koodia takuitta.'
                : 'This software is licensed under the GNU General Public License v3.0. You are free to use, modify, and distribute it.'}
            </p>
            <a 
              href="https://www.gnu.org/licenses/gpl-3.0.en.html" 
              target="_blank" 
              rel="noreferrer"
              className="inline-block text-xs text-blue-400 hover:underline"
            >
              {lang === 'fi' ? 'Lue lisää GPLv3-lisenssistä →' : 'Read more about GPLv3 →'}
            </a>
          </div>
        </div>

      </div>

      {/* Alatunniste */}
      <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-800">
        SwissKnife DevTools © {new Date().getFullYear()} — Released under GNU GPLv3
      </div>
    </div>
  );
};