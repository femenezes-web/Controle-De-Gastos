import React, { useState, useEffect } from 'react';
import { 
  QrCode, Smartphone, Copy, Check, X, Download, Share2, 
  Sparkles, ExternalLink, HelpCircle, CheckCircle2 
} from 'lucide-react';
import QRCode from 'qrcode';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface MobileAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAccessModal: React.FC<MobileAccessModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'android' | 'ios'>('qr');

  const currentUrl = typeof window !== 'undefined' 
    ? window.location.href.split('#')[0].split('?')[0] 
    : 'https://ais-pre-gokgr6u4kwddtuwo4r6onu-29798844751.us-east5.run.app';

  useEffect(() => {
    if (isOpen && currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#064e3b',
          light: '#ffffff'
        }
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating QR Code:', err));
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeInstall = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Usar no Celular</h2>
              <p className="text-xs text-slate-500">Acesse e instale no Android ou iPhone</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-6 bg-white gap-2 pt-2">
          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'qr'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Escanear QR Code
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'android'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="text-xs">🤖</span>
            Android (Chrome)
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'ios'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="text-xs">🍏</span>
            iPhone (Safari)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Native Install Banner if available */}
          {isInstallable && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-950">Instalação Direta Pronta</h4>
                  <p className="text-xs text-emerald-700">Instale o Ricos Também Fazem Conta como aplicativo nativo agora</p>
                </div>
              </div>
              <button
                onClick={handleNativeInstall}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition whitespace-nowrap"
              >
                Instalar App
              </button>
            </div>
          )}

          {isInstalled && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>O app Ricos Também Fazem Conta já está instalado neste aparelho!</span>
            </div>
          )}

          {/* Tab 1: QR Code */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm inline-block">
                {qrDataUrl ? (
                  <img 
                    src={qrDataUrl} 
                    alt="QR Code do app" 
                    className="w-52 h-52 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
                    Gerando QR Code...
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="font-semibold text-slate-800 text-sm">Abra a câmera do celular e aponte para o código</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Funciona em qualquer smartphone Android ou iPhone com conexão à internet.
                </p>
              </div>

              {/* URL and Copy Link button */}
              <div className="w-full flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 pl-3">
                <input 
                  type="text" 
                  readOnly 
                  value={currentUrl} 
                  className="bg-transparent text-xs text-slate-600 flex-1 outline-none font-mono select-all truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar Link
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Android (Chrome) */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-3">
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                  Acesse pelo Google Chrome
                </h4>
                <p className="text-xs text-slate-600 pl-7">
                  Abra o link no navegador Chrome do seu celular Android.
                </p>

                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                  Adicione à Tela Inicial
                </h4>
                <p className="text-xs text-slate-600 pl-7">
                  Toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito do Chrome e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </p>

                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                  Ícone na Tela do Celular
                </h4>
                <p className="text-xs text-slate-600 pl-7">
                  O ícone do <strong>Ricos Também Fazem Conta</strong> aparecerá na sua tela de aplicativos como um app normal, funcionando em tela cheia e sem barra de navegação do browser!
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
                >
                  <Copy className="w-4 h-4 text-slate-500" />
                  {copied ? 'Link Copiado!' : 'Copiar Link para enviar pelo WhatsApp'}
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: iPhone (Safari) */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-3">
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                  Abra no Safari do iPhone
                </h4>
                <p className="text-xs text-slate-600 pl-7">
                  No iPhone ou iPad, acesse o link através do navegador <strong>Safari</strong> nativo.
                </p>

                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                  Toque no botão Compartilhar
                </h4>
                <p className="text-xs text-slate-600 pl-7">
                  Na barra inferior do Safari, toque no ícone de <strong>Compartilhar</strong> (o quadrado com uma seta para cima <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-600" />).
                </p>

                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                  Adicionar à Tela de Início
                </h4>
                <p className="text-xs text-slate-600 pl-7">
                  Role o menu de opções para baixo e selecione <strong>"Adicionar à Tela de Início"</strong> (ícone de ➕) e confirme em <strong>"Adicionar"</strong>.
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
                >
                  <Copy className="w-4 h-4 text-slate-500" />
                  {copied ? 'Link Copiado!' : 'Copiar Link para enviar para o iPhone'}
                </button>
              </div>
            </div>
          )}

          {/* Cloud Deploy explanation box */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-left">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 space-y-1">
                <p className="font-semibold">Como fazer o Deploy definitivo no Google Cloud:</p>
                <p className="text-blue-700 leading-relaxed">
                  No menu superior do Google AI Studio, clique em <strong>Share</strong> para gerar o link público, ou selecione <strong>Deploy to Cloud Run</strong> para hospedar a aplicação 24h por dia na nuvem do Google.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
