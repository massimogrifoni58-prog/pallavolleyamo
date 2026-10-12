import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// La versione normale e quella dimostrativa si costruiscono dallo stesso
// codice: cambia solo dove puntano i tre moduli di Firebase.
//
//   npm run build        → l'app vera, che parla con Firebase
//   npm run build:demo   → la demo, che tiene tutto in memoria
//
// In modalità demo gli alias fanno sì che "firebase/firestore" e compagnia
// risolvano ai moduli finti in src/demo. Nessuna pagina dell'app va toccata:
// continua a importare le stesse funzioni e non sa che dall'altra parte non
// c'è nessun database. E `base: './'` serve perché la demo si apra con un
// doppio clic su index.html, senza un server.
const finto = (file) => fileURLToPath(new URL(`./src/demo/${file}`, import.meta.url))

export default defineConfig(({ mode }) => {
  const demo = mode === 'demo'
  return {
    plugins: [react()],
    base: demo ? './' : '/',
    // In demo tutto finisce in un file solo: le importazioni dinamiche
    // vengono incorporate, perché da file:// il browser non può andare a
    // prendere altri file (vedi strumenti/fileUnicoDemo.mjs).
    build: demo
      ? {
          outDir: 'dist-demo',
          cssCodeSplit: false,
          rollupOptions: { output: { inlineDynamicImports: true } },
        }
      : {},
    resolve: {
      alias: demo
        ? [
            { find: /^firebase\/firestore$/, replacement: finto('fintoFirestore.js') },
            { find: /^firebase\/auth$/, replacement: finto('fintoAuth.js') },
            { find: /^firebase\/app$/, replacement: finto('fintoApp.js') },
            { find: /^firebase\/messaging$/, replacement: finto('fintoMessaging.js') },
          ]
        : [],
    },
  }
})
