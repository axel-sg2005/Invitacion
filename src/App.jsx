import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  Calendar,
  MapPin,
  Clock,
  Utensils,
  Gift,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Copy,
  ChevronRight
} from 'lucide-react';

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "dummy-key",
  authDomain: "dummy-domain.firebaseapp.com",
  projectId: "dummy-project",
  storageBucket: "dummy-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'pokemon-bday-123';

const App = () => {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('welcome'); // 'welcome' o 'invitation'
  const [nombre, setNombre] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [listaAsistencia, setListaAsistencia] = useState([]);
  const [loading, setLoading] = useState(false);

  // Clave maestra para ver asistencias
  const ADMIN_NAME = "SAGA0504064FA";

  // URL del fondo de Pokébolas con color rojo
  const bgPatternUrl = "https://th.bing.com/th/id/R.84c662dbdece47ea669213aa48faaf63?rik=vGnczL12uY%2fCFg&riu=http%3a%2f%2fst2.depositphotos.com%2f3213441%2f12022%2fv%2f950%2fdepositphotos_120226584-stock-illustration-pokemon-go-pokeball-seamless-texture.jpg&ehk=e1t8ieBXwfnv1YffdAhsJlk%2bd0J%2f7tJ%2fdquEgjCpPXs%3d&risl=&pid=ImgRaw&r=0";

  // URLs de las imágenes proporcionadas por el usuario
  const imgPikachu = "https://i.pinimg.com/originals/7b/2a/a3/7b2aa3dd078b964c6e6b1b6f800dbea6.jpg";
  const imgCharizard = "https://th.bing.com/th/id/R.84351342681e4ce15cd4d2cdac73aa8a?rik=ZCrXRQHuYyv41g&riu=http%3a%2f%2forig12.deviantart.net%2f4edc%2ff%2f2013%2f280%2f3%2f2%2f02_by_nurinaki-d6pkya9.png&ehk=LNXuADQhwnM9t%2fK1zAHvmEwxf9bQkX%2bKT6ocKbt89XQ%3d&risl=1&pid=ImgRaw&r=0";
  const imgLucario = "https://tse2.mm.bing.net/th/id/OIP.59SAgMsia26XxWmum3O_nQHaKd?rs=1&pid=ImgDetMain&o=7&rm=3";

  // Estilo común para el fondo repetido
  const backgroundStyle = {
    backgroundImage: `url(${bgPatternUrl})`,
    backgroundSize: '180px',
    backgroundRepeat: 'repeat',
  };

  // Manejo de Autenticación
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          try {
            await signInAnonymously(auth);
          } catch (e) {
            console.warn("Autenticación anónima falló (probablemente por falta de configuración real), continuando sin DB:", e);
          }
        }
      } catch (error) {
        console.error("Error de auth:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Escuchar lista de invitados
  useEffect(() => {
    if (step !== 'invitation') return;

    // Cargar asistencias locales para garantizar que se visualicen sin Firebase
    const localData = JSON.parse(localStorage.getItem('asistencias') || '[]');
    setListaAsistencia(localData);

    if (!user) return;

    try {
      const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'asistencias');
      const unsubscribe = onSnapshot(collectionRef,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Combinar datos locales con los de Firebase
          const mergedData = [...localData];
          data.forEach(fbItem => {
            if (!mergedData.find(localItem => localItem.nombre === fbItem.nombre)) {
              mergedData.push(fbItem);
            }
          });

          setListaAsistencia(mergedData);
        },
        (error) => console.error("Error Firestore (lectura):", error)
      );
      return () => unsubscribe();
    } catch (e) {
      console.error("Error configurando snapshot:", e);
    }
  }, [user, step]);

  const handleEnter = () => {
    if (nombre.trim().length < 3) {
      alert("Por favor, ingresa tu nombre para continuar.");
      return;
    }
    setStep('invitation');
  };

  const enviarRespuesta = async (tipo) => {
    setLoading(true);
    try {
      const nuevaAsistencia = {
        id: Date.now().toString(),
        nombre: nombre,
        asiste: tipo === 'si',
        userId: user ? user.uid : 'local-user',
        fecha: new Date().toISOString()
      };

      // Guardar localmente para que funcione sin o con Firebase
      const localData = JSON.parse(localStorage.getItem('asistencias') || '[]');
      localData.push(nuevaAsistencia);
      localStorage.setItem('asistencias', JSON.stringify(localData));
      setListaAsistencia(localData);

      if (!user) {
        setTimeout(() => {
          setEnviado(true);
          setLoading(false);
        }, 800);
        return;
      }

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'asistencias'), {
        nombre: nombre,
        asiste: tipo === 'si',
        userId: user.uid,
        fecha: new Date().toISOString()
      });
      setEnviado(true);
    } catch (e) {
      console.error("Error al enviar Firebase:", e);
      // El guardado local ya funcionó, así que se marca como enviado
      setEnviado(true);
    } finally {
      setLoading(false);
    }
  };

  const copiarCuenta = () => {
    const cuenta = "5101 2516 4334 5511";
    // Modern copy approach
    navigator.clipboard.writeText(cuenta).then(() => {
      alert("¡Cuenta copiada al portapapeles!");
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  // Pantalla 1: Bienvenida
  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative" style={backgroundStyle}>
        <div className="absolute inset-0 bg-blue-700/70 backdrop-blur-[1px]"></div>
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transform transition-all relative z-10 border-4 border-blue-900">
          <div className="bg-yellow-400 p-8 text-center border-b-8 border-blue-700">
            <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-inner border-4 border-blue-600 overflow-hidden">
              <img src={imgPikachu} alt="Pikachu Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl font-black text-blue-800 uppercase italic tracking-tighter">
              ¡Poke-Invitación!
            </h1>
          </div>
          <div className="p-8 bg-white/95">
            <p className="text-slate-600 text-center mb-6 font-medium">
              ¡Hola! Para entrar a la aventura, por favor dinos quién eres:
            </p>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleEnter()}
              placeholder="Tu nombre de Entrenador..."
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-yellow-400 focus:outline-none text-lg mb-6 transition-all text-center font-bold"
            />
            <button
              onClick={handleEnter}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 group transition-all"
            >
              ¡ENTRAR! <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla 2: Invitación
  return (
    <div className="min-h-screen font-sans text-slate-800 pb-20 relative" style={backgroundStyle}>
      <div className="absolute inset-0 bg-white/70 pointer-events-none"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="relative overflow-hidden bg-blue-600 text-white py-12 px-4 text-center shadow-lg border-b-8 border-yellow-400">
          <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter uppercase italic">
            ¡Te invito a mi cumple de mi primer decada!
          </h1>
          <div className="flex justify-center">
            <p className="text-xl md:text-2xl font-bold bg-yellow-400 text-blue-900 inline-block px-6 py-2 rounded-full transform -rotate-2 shadow-md">
              Entrenador: {nombre}
            </p>
          </div>
        </div>

        {/* Galería de Imágenes */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 px-4 -mt-8 relative z-10">
          <div className="bg-white p-2 rounded-2xl shadow-xl transform hover:scale-105 transition-transform border border-slate-100 overflow-hidden">
            <div className="bg-slate-100 rounded-xl overflow-hidden h-64 flex items-center justify-center">
              <img src={imgPikachu} alt="Pikachu" className="w-full h-full object-cover" />
            </div>
            <p className="text-center font-bold text-yellow-600 mt-2 py-2 uppercase tracking-widest text-xs italic">Pikachu</p>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-xl transform md:scale-110 hover:scale-110 transition-transform border-4 border-blue-400 overflow-hidden">
            <div className="bg-slate-100 rounded-xl overflow-hidden h-64 flex items-center justify-center">
              <img src={imgCharizard} alt="Mega Charizard X" className="w-full h-full object-contain" />
            </div>
            <p className="text-center font-bold text-blue-600 mt-2 py-2 uppercase tracking-widest text-xs italic">Mega Charizard X</p>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-xl transform hover:scale-105 transition-transform border border-slate-100 overflow-hidden">
            <div className="bg-slate-100 rounded-xl overflow-hidden h-64 flex items-center justify-center">
              <img src={imgLucario} alt="Lucario" className="w-full h-full object-cover" />
            </div>
            <p className="text-center font-bold text-slate-600 mt-2 py-2 uppercase tracking-widest text-xs italic">Lucario</p>
          </div>
        </div>

        {/* Info del Evento */}
        <div className="max-w-3xl mx-auto mt-16 px-4 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-xl border-b-4 border-yellow-400">
              <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2"><Calendar size={24} /> ¿Cuándo?</h2>
              <div className="space-y-3">
                <div>
                  <p className="font-black text-2xl text-slate-700 uppercase">25 de Abril</p>
                  <p className="text-slate-500 font-bold flex items-center gap-2"><Clock size={16} /> 15:00 - 20:00 hrs</p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-blue-600 font-black text-sm uppercase flex items-center gap-2">
                    <Utensils size={14} /> Hora de Comida:
                  </p>
                  <p className="text-slate-700 font-bold text-lg italic">16:00 - 18:00 hrs</p>
                </div>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-xl border-b-4 border-blue-400">
              <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2"><MapPin size={24} /> ¿Dónde?</h2>
              <p className="font-bold text-lg">Salón de Fiestas "Poke-Mundo"</p>
              <a
                href="https://maps.app.goo.gl/ZMaeHa2rUVc7oE9Y8"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-600 transition-colors shadow-md"
              >
                Abrir en Google Maps
              </a>
            </div>
          </div>

          {/* Regalo */}
          <div className="bg-gradient-to-br from-blue-700/95 to-blue-900/95 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden group border border-white/10">
            <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform">
              <Gift size={150} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Gift className="text-yellow-400" />
                <h3 className="text-xl font-bold italic uppercase tracking-tighter">Sugerencia de Regalo</h3>
              </div>
              <p className="text-blue-100 text-sm mb-6 leading-relaxed max-w-md">
                ¡Tu presencia es mi mejor regalo! Pero si deseas tener un detalle conmigo, puedes realizar una transferencia aquí:
              </p>
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl flex items-center justify-between border border-white/20">
                <code className="text-yellow-400 text-lg md:text-xl font-mono font-bold tracking-widest">5101 2516 4334 5511</code>
                <button
                  onClick={copiarCuenta}
                  title="Copiar Cuenta"
                  className="bg-yellow-400 text-blue-900 p-3 rounded-xl hover:bg-yellow-300 transition-colors shadow-lg active:scale-95"
                >
                  <Copy size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Formulario Confirmación */}
          {!enviado ? (
            <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl border-4 border-yellow-400">
              <h2 className="text-3xl font-black text-blue-800 mb-6 text-center uppercase tracking-tighter">¿Cuento contigo?</h2>
              <div className="grid grid-cols-2 gap-6">
                <button
                  onClick={() => enviarRespuesta('si')}
                  disabled={loading}
                  className="bg-green-500 text-white py-6 rounded-2xl font-black text-xl shadow-lg hover:bg-green-600 transition-all flex flex-col items-center gap-2 group disabled:opacity-50"
                >
                  <CheckCircle size={32} className="group-hover:scale-110 transition-transform" />
                  <span>SÍ ASISTO</span>
                </button>
                <button
                  onClick={() => enviarRespuesta('no')}
                  disabled={loading}
                  className="bg-slate-200 text-slate-500 py-6 rounded-2xl font-black text-xl hover:bg-slate-300 transition-all flex flex-col items-center gap-2 disabled:opacity-50"
                >
                  <XCircle size={32} />
                  <span>NO PUEDO</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-500 text-white p-10 rounded-3xl text-center shadow-2xl">
              <CheckCircle size={64} className="mx-auto mb-4" />
              <h2 className="text-3xl font-black uppercase italic">¡REGISTRADO!</h2>
              <p className="text-green-100 font-bold mt-2">Gracias por confirmar, Entrenador {nombre}.</p>
            </div>
          )}

          {/* Sección de Asistencias Restringida */}
          {nombre === ADMIN_NAME && (
            <div className="mt-12 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
              <div className="bg-slate-800 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-yellow-400" />
                  <div>
                    <h3 className="font-black uppercase italic">Panel Maestro</h3>
                    <p className="text-xs text-slate-400">Solo visible para {ADMIN_NAME}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-yellow-400">{listaAsistencia.filter(a => a.asiste).length}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Invitados Confirmados</p>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Entrenador</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Estatus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {listaAsistencia.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-slate-700 uppercase italic text-sm">{inv.nombre}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${inv.asiste ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {inv.asiste ? 'CONFIRMADO' : 'NO ASISTE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-10 text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
            Pokémon Birthday Bash © 2026
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
