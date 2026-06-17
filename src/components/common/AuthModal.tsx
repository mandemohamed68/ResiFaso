import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Phone, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { UserRole, UserProfile } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
      setSuccess("Connexion réussie avec Google !");
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 3500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Échec de la connexion avec Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Secure fallback / validation check for our Super Admin credentials
    const isSuperAdminEmail = email.toLowerCase().trim() === 'mandemohamed68@gmail.com';
    const isSuperAdminPassword = password === 'mm@27071986@';

    try {
      if (isSignUp) {
        if (!displayName) {
          throw new Error("Veuillez saisir votre nom complet.");
        }
        // Create user in firebase
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // Add display name in Auth
        await updateProfile(firebaseUser, { displayName });

        // Save UserProfile in Firestore
        const roleToAssign: UserRole = isSuperAdminEmail ? 'admin' : selectedRole;
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || email,
          displayName,
          phoneNumber,
          role: roleToAssign,
          isVerified: isSuperAdminEmail, // Super admin is auto-verified
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
        setSuccess("Votre compte a été créé avec succès ! En cours de connexion...");
      } else {
        // Sign in user in Firebase
        try {
          await signInWithEmailAndPassword(auth, email, password);
          setSuccess("Connexion réussie !");
        } catch (firebaseErr: any) {
          // If Email/Password provider isn't enabled in Firebase, or user does not exist in Firebase Auth,
          // but we want to allow immediate Super Admin logins as requested!
          if (isSuperAdminEmail && isSuperAdminPassword) {
            console.log("Super Admin override - sign in fallback active");
            // If the user doesn't exist in Firebase Auth yet, we can create/sign in them or provide a message.
            // Let's attempt to create the user automatically as fallback to guarantee successful login.
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, email, password);
              const firebaseUser = userCredential.user;
              await updateProfile(firebaseUser, { displayName: "Mohamed Mande" });
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || email,
                displayName: "Mohamed Mande",
                phoneNumber: "+226 70 00 00 00",
                role: 'admin',
                isVerified: true,
                createdAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
              setSuccess("Compte Super Admin initialisé et connecté !");
            } catch (createErr: any) {
              // If user already exists but password was correct or there was another error, rethrow or handle:
              if (createErr.code === 'auth/email-already-in-use') {
                // The account exists but maybe Firebase email/password auth is disabled, let's explain
                throw new Error("L'adresse email existe déjà. Si vous avez oublié votre mot de passe, utilisez la réinitialisation. Activez le fournisseur Email/Mot de passe dans votre Console Firebase.");
              }
              throw createErr;
            }
          } else {
            throw firebaseErr;
          }
        }
      }

      setTimeout(() => {
        onClose();
        setSuccess(null);
        // Page level state will auto-refresh via AuthContext's onAuthStateChanged listener
      }, 3500);

    } catch (err: any) {
      console.error("Auth error:", err);
      let errorMsg = err.message || "Une erreur est survenue lors de l'authentification.";
      if (err.code === 'auth/operation-not-allowed') {
        errorMsg = "La connexion par Email/Mot de passe n'est pas activée dans votre Firebase Console. Activez 'Email/Password' sous Firebase Auth > Sign-in method.";
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = "Adresse email ou mot de passe incorrect.";
      } else if (err.code === 'auth/user-not-found') {
        errorMsg = "Aucun utilisateur trouvé avec cette adresse email.";
      } else if (err.code === 'auth/email-already-in-use') {
        errorMsg = "Cette adresse email est déjà utilisée.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-8 overflow-y-auto z-10 max-h-[90vh]"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="mb-6 text-center">
          <div className="inline-flex w-32 h-32 items-center justify-center mb-2 overflow-visible relative">
            <img src="/logo.png" alt="ResiFaso" className="w-[180%] h-[180%] max-w-[180%] object-contain mix-blend-multiply absolute scale-125" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            {isSignUp ? "Créer un compte" : "Connexion"}
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            {isSignUp ? "Rejoignez ResiFaso dès aujourd'hui" : "Accédez à votre espace ResiFaso"}
          </p>
        </div>

        {/* Notifications */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs font-semibold mb-6"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>{error}</div>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl text-green-800 text-xs font-semibold mb-6"
            >
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <div>{success}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Nom Complet</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-slate-300" size={18} />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Abdoulaye Sawadogo"
                    className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 pl-12 pr-4 outline-none text-sm font-bold transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Téléphone (Burkina Faso)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 text-slate-300" size={18} />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+226 70 12 34 56"
                    className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 pl-12 pr-4 outline-none text-sm font-bold transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">S'inscrire comme</label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('client')}
                    className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all ${
                      selectedRole === 'client'
                        ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Voyageur
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('owner')}
                    className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all ${
                      selectedRole === 'owner'
                        ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Propriétaire
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Adresse Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-300" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 pl-12 pr-4 outline-none text-sm font-bold transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">Mot de Passe</label>
              {!isSignUp && (
                <button 
                  type="button"
                  className="text-xs text-red-600 hover:underline font-bold"
                  onClick={() => alert("Pour réinitialiser votre mot de passe, veuillez contacter le support.")}
                >
                  Oublié ?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-300" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 pl-12 pr-4 outline-none text-sm font-bold transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white rounded-2xl py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-red-100 hover:bg-red-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? "Chargement..." : isSignUp ? "Créer mon Compte" : "Se Connecter"}
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-slate-100"></div>
          <span className="flex-shrink mx-4 text-slate-300 text-[10px] uppercase font-black tracking-widest">OU</span>
          <div className="flex-grow border-t border-slate-100"></div>
        </div>

        {/* Google sign in */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl py-3.5 text-sm transition-all shadow-sm active:scale-[0.98]"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.89 3.02C6.2 7.74 8.89 5.04 12 5.04z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.43c-.28 1.44-1.09 2.66-2.31 3.47v2.88h3.74c2.18-2 3.63-4.96 3.63-8.45z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 10.58c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.39 5.27C.5 7.03 0 9.01 0 11.27s.5 4.24 1.39 6l3.89-3.02c-.24-.72-.38-1.49-.38-2.29z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.74-2.88c-1.04.7-2.37 1.11-4.22 1.11-3.11 0-5.8-2.7-6.72-5.54l-3.89 3.02C3.37 19.33 7.35 23 12 23z"
            />
          </svg>
          Se connecter avec Google
        </button>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors"
          >
            {isSignUp ? (
              <span>Déjà un compte ? <strong className="text-red-600">Connectez-vous</strong></span>
            ) : (
              <span>Nouveau sur la plateforme ? <strong className="text-red-600 font-extrabold text-sm uppercase tracking-wider ml-1">S'inscrire</strong></span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
