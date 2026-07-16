// ============================================
//  BOT DE WHATSAPP — FINANZAS PARA MI AMOR
//  Sofi · Tu profe de finanzas por WhatsApp
// ============================================
//
//  Stack: Node.js + Express + WhatsApp Business Cloud API (gratis)
//  IA opcional: Claude API para preguntas libres
//
//  SETUP RÁPIDO:
//  1. Lee INSTRUCCIONES.md (todo paso a paso)
//  2. npm install
//  3. Configura las variables de entorno
//  4. node bot.js
//  5. Despliega en Railway.app (gratis)
//
// ============================================

const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// ====== CONFIGURACIÓN ======
const VERIFY_TOKEN       = process.env.VERIFY_TOKEN      || 'sofi_finanzas_2026';
const WHATSAPP_TOKEN     = process.env.WHATSAPP_TOKEN    || 'PEGAR_AQUI_TOKEN_META';
const PHONE_NUMBER_ID    = process.env.PHONE_NUMBER_ID   || 'PEGAR_AQUI_PHONE_ID';
const ANTHROPIC_API_KEY  = process.env.ANTHROPIC_API_KEY || '';
const USE_AI             = !!ANTHROPIC_API_KEY;

const API = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

// ====== ALMACÉN DE USUARIOS (en memoria) ======
// Para producción real, usa Redis/Supabase/MongoDB
const users = new Map();

function getUser(phone) {
  if (!users.has(phone)) {
    users.set(phone, {
      progress: new Set(),
      currentModule: null,
      awaitingQuizAnswer: null,
      lastInteraction: Date.now(),
      conversationHistory: []
    });
  }
  return users.get(phone);
}

// ============================================
//  CONTENIDO EDUCATIVO (16 temas)
// ============================================
const MODULES = {
  'invertir': {
    title: '¿Qué es invertir?',
    emoji: '🌱',
    body: `¡Hola! Te explico con una analogía simple 🌱\n\nImagina que tienes una plantita. Puedes:\n• Dejarla guardada sin cuidarla (ahorrar)\n• Plantarla en buena tierra y regarla para que crezca (invertir)\n\n*Invertir* significa poner tu dinero a trabajar para que crezca con el tiempo.\n\nLa diferencia con *ahorrar*:\n• _Ahorrar_: guardas el dinero seguro, pero crece muy poquito\n• _Invertir_: lo pones en activos que pueden crecer más, aunque con algo más de riesgo\n\n📊 *Ejemplo con $1.000 en 10 años:*\n• Ahorro al 2% anual → tendrías $1.219\n• Inversión al 7% anual → tendrías $1.967\n\nCon el tiempo, esa diferencia se vuelve ENORME. Por eso aprender a invertir es una de las mejores cosas que puedes hacer 💪`,
    keyTakeaway: 'Invertir = hacer crecer tu dinero con el tiempo, asumiendo algo de riesgo calculado.'
  },
  'interes compuesto': {
    title: 'Interés compuesto',
    emoji: '📈',
    body: `El interés compuesto es *el motor mágico* de la inversión 🚀\n\nEs súper simple: ganas intereses, y *esos intereses también generan más intereses*.\n\n📊 *Ejemplo: $1.000 al 7% anual*\n• Año 5: $1.403\n• Año 10: $1.967\n• Año 20: $3.870\n• Año 30: $7.612\n\n¡Sin agregar ni un peso más! Tu dinero solo trabajando para ti.\n\n💡 *La frase clave:*\n_"El mejor momento para invertir fue hace 20 años. El segundo mejor momento es hoy."_\n\nNo importa si empiezas con poco. Lo que importa es empezar y ser constante. El tiempo es tu mejor amigo 💛`,
    keyTakeaway: 'El interés compuesto hace que tu dinero se multiplique solo con el paso del tiempo.'
  },
  'riesgo y retorno': {
    title: 'Riesgo y retorno',
    emoji: '⚖️',
    body: `Esta es la regla más importante de las inversiones:\n\n*A mayor riesgo, mayor retorno potencial (y mayor pérdida potencial).*\n\nEs como una balanza: si quieres ganar más, tienes que aceptar más volatilidad. Si quieres dormir 100% tranquila, ganarás menos.\n\n🛡️ *Bajo riesgo:* cuenta de ahorro, letras del Tesoro (2-4% anual)\n⚖️ *Riesgo medio:* bonos, fondos indexados (5-9% anual)\n🚀 *Alto riesgo:* acciones, cripto (variable, pero más a largo plazo)\n\n💡 *Concepto clave:* la _volatilidad_ (que suba y baje) no es lo mismo que el _riesgo real_. El verdadero riesgo es necesitar el dinero en el peor momento.`,
    keyTakeaway: 'Más retorno requiere más riesgo. Encuentra el balance que te deje dormir tranquila.'
  },
  'diversificacion': {
    title: 'Diversificación',
    emoji: '🥚',
    body: `Warren Buffett dice que la diversificación es *"la única comida gratis"* en inversiones. ¿Por qué?\n\n🥚 El proverbio: "No pongas todos los huevos en una misma canasta". Si se cae, pierdes todo.\n\nEn inversiones esto significa: *no inviertas todo en una sola cosa*.\n\nPuedes diversificar en:\n• *Tipos de activo:* acciones, bonos, propiedades\n• *Sectores:* tecnología, salud, energía\n• *Países:* tu país + otros\n• *Monedas:* no solo una\n\n📊 *Ejemplo:* si metes todo en una acción y cae 60%, pierdes $6.000 de cada $10.000. Si tienes 5 acciones diversificadas y una cae 60%, pierdes solo $1.200 💪`,
    keyTakeaway: 'Reparte tu dinero en distintos activos para reducir el riesgo de perder mucho.'
  },
  'acciones': {
    title: 'Las acciones',
    emoji: '🏢',
    body: `Una *acción* es un pequeño pedacito de propiedad de una empresa. Cuando compras una acción de Apple o Mercado Libre, te conviertes en *dueña* de una parte de esa empresa 🏢\n\nComo dueña tienes derecho a:\n• *Dividendos:* parte de las ganancias que reparte la empresa\n• *Plusvalía:* si la empresa crece, tu pedacito también\n• *Voto:* en algunas decisiones (no todas las acciones)\n\n📊 *Dato:* en los últimos 100 años, las acciones han dado un promedio de 7-10% anual ajustado por inflación. Ha habido crisis, guerras, pandemias… y a largo plazo siempre han subido.\n\n⚠️ *Riesgo:* una acción individual *puede caer a cero* si la empresa quiebra. Por eso es mejor combinar varias (o usar fondos indexados).`,
    keyTakeaway: 'Una acción = un pedacito de una empresa. Su precio cambia según cómo le va.'
  },
  'bonos': {
    title: 'Los bonos',
    emoji: '📜',
    body: `Si una acción es *ser dueño* de una empresa, un bono es *prestarle dinero* a cambio de intereses 💰\n\n📋 *Funcionamiento:*\n• Compras un bono del gobierno a 10 años con cupón del 5%\n• Cada año recibes 5% de interés\n• Al final te devuelven todo tu dinero\n\n🏛️ *Tipos:*\n• *Bonos del Tesoro* (gobierno): más seguros\n• *Bonos corporativos:* de empresas, un poco más de riesgo\n• *Bonos high yield:* empresas más riesgosas, pagan más\n\n💡 ¿Para qué sirven? Para *estabilizar* tu cartera. Cuando las acciones caen fuerte, los bonos suelen caer menos. Es como un amortiguador 🛡️\n\n📌 *Regla:* las tasas de interés y los precios de los bonos van en direcciones opuestas.`,
    keyTakeaway: 'Un bono es un préstamo que tú haces al gobierno o a una empresa, y te devuelven con intereses.'
  },
  'fondos y etfs': {
    title: 'Fondos y ETFs',
    emoji: '🧺',
    body: `En lugar de comprar 100 acciones tú sola, compras *1 participación de un fondo que ya tiene 100 acciones* 🧺\n\nEso es un *fondo de inversión*: muchas personas ponen su dinero, un equipo lo invierte en múltiples activos, y tú recibes tu parte proporcional de las ganancias.\n\n*ETF* (Exchange-Traded Fund) es un tipo de fondo que se compra como una acción. Tiene comisiones más bajas.\n\n🏆 *El favorito de los expertos: los fondos indexados*\n• Replican un índice (como el S&P 500: las 500 empresas más grandes de EE.UU.)\n• Comisiones mínimas (0.03-0.20% al año)\n• Resultados excelentes a largo plazo\n\n💰 *Las comisiones importan MUCHO.* Una diferencia del 1% anual, en 30 años, puede costarte el 25% de tu riqueza final.`,
    keyTakeaway: 'Los fondos te dan diversificación instantánea con bajas comisiones. Perfectos para empezar.'
  },
  'criptomonedas': {
    title: 'Criptomonedas',
    emoji: '🪙',
    body: `Bitcoin, Ethereum y compañía son activos digitales que funcionan sin bancos ni gobiernos 🪙\n\nLa primera y más famosa es *Bitcoin* (creada en 2009). *Ethereum* es la segunda y permite contratos inteligentes.\n\n✅ *Lo bueno:*\n• Potencial de crecimiento enorme\n• Descentralización (sin control de bancos)\n• Innovación tecnológica real\n\n⚠️ *Los riesgos:*\n• Volatilidad extrema: ha caído más del 70% varias veces\n• Estafas: miles de proyectos fraudulentos\n• Regulación incierta\n• Sin valor intrínseco demostrable\n\n🧠 *Regla de oro:* si decides invertir en cripto, asigna máximo un *5-10% de tu cartera total*. Solo en las más consolidadas (Bitcoin, Ethereum). No inviertas dinero que no puedas permitirte perder.\n\n🌶️ *Analogía:* la cripto es como el chile picante — una pizca le da sabor, pero si le pones todo chile, no vas a poder comer.`,
    keyTakeaway: 'Inversión de alto riesgo y volatilidad. Máximo 5-10% de tu cartera, solo en las principales.'
  },
  'bienes raices': {
    title: 'Bienes raíces',
    emoji: '🏠',
    body: `Comprar propiedades para alquilar o vender es una de las formas más antiguas de inversión 🏠\n\n📋 *Formas de hacerlo:*\n• *Directo:* comprar un depto o casa\n• *REITs:* fondos que invierten en propiedades (más líquido)\n• *Crowdfunding:* invertir junto con otros en proyectos grandes\n\n💰 *Ganas dinero con:*\n1. *Alquiler:* ingreso mensual\n2. *Plusvalía:* la propiedad sube de valor con el tiempo\n3. *Apalancamiento:* usas una hipoteca para controlar un activo más grande con menos dinero tuyo\n\n🧮 *Regla del 1%:* el alquiler mensual debería ser al menos el 1% del valor de la propiedad. Si una propiedad de $100.000 no te da $1.000/mes, no es buen negocio.\n\n👍 *Ventajas:* tangible, protección contra inflación\n👎 *Desventajas:* mucho capital, poco líquido, costos ocultos (impuestos, mantenimiento, reparaciones)`,
    keyTakeaway: 'Las propiedades dan ingreso por alquiler y plusvalía, pero requieren capital grande.'
  },
  'asignacion de activos': {
    title: 'Asignación de activos',
    emoji: '🎨',
    body: `La asignación de activos es la decisión *más importante* de tu inversión. Es decidir qué porcentaje va a cada tipo: ¿cuánto en acciones? ¿cuánto en bonos? ¿cuánto en efectivo?\n\nLos estudios dicen que el 90% del rendimiento depende de esta decisión (no de elegir "la acción perfecta").\n\n📊 *Asignación típica según edad:*\n• _20-30 años:_ 80-90% acciones, 5-15% bonos\n• _30-45 años:_ 70-80% acciones, 15-25% bonos\n• _45-60 años:_ 50-70% acciones, 25-40% bonos\n• _60+ años:_ 30-50% acciones, 40-60% bonos\n\nA mayor edad y cercanía a necesitar el dinero, más conservador.\n\n💡 *La "Estrategia 3 fondos":*\n1. Un fondo indexado global de acciones\n2. Un fondo de bonos globales\n3. Un fondo de tu país (opcional)\n\nSolo 3 productos. Diversificación mundial. Comisiones bajísimas. Simple y efectivo 🎯`,
    keyTakeaway: 'Decide qué % va a cada tipo de activo según tu edad y perfil. Es la decisión que más impacta tu retorno.'
  },
  'perfil de inversor': {
    title: 'Tu perfil de inversor',
    emoji: '🧭',
    body: `Antes de invertir un peso, necesitas saber quién eres como inversora. Tu perfil depende de 3 factores:\n\n1️⃣ *Tolerancia al riesgo:* ¿Cuánto puedes ver caer tu cartera sin entrar en pánico?\nSi baja 30%, ¿qué harías?\n\n2️⃣ *Horizonte temporal:* ¿Cuánto tiempo hasta necesitar el dinero?\n5 años, 10 años, 30 años\n\n3️⃣ *Capacidad financiera:* ¿Tienes fondo de emergencia y deudas bajo control?\n\n🎭 *Los 3 perfiles:*\n\n🛡️ *Conservadora:* prioriza no perder. 20% acciones, 70% bonos, 10% efectivo\n\n⚖️ *Moderada:* balance. 60% acciones, 35% bonos, 5% efectivo\n\n🚀 *Agresiva:* acepta volatilidad por más retorno. 85% acciones, 10% bonos, 5% otros\n\nLa respuesta correcta no es objetivamente "una" — es la que te permita *dormir tranquila* y mantener la estrategia a largo plazo 💛`,
    keyTakeaway: 'Tu perfil depende de tu tolerancia al riesgo, tu horizonte de tiempo y tu situación financiera.'
  },
  'costos e impuestos': {
    title: 'Costos e impuestos',
    emoji: '💸',
    body: `Las comisiones e impuestos son las dos fuerzas que más erosionan tu riqueza si no las controlas 💸\n\n💸 *Tipos de costos:*\n• *Comisión de compra/venta:* cada vez que compras o vendes\n• *Comisión de gestión anual (TER):* % sobre lo invertido\n• *Spread:* diferencia entre precio de compra y venta\n• *Comisiones ocultas:* retiros, conversiones, inactividad\n\n🧮 *El impacto real:*\nInviertes $10.000 a 30 años con 7% anual antes de comisiones:\n• 0% comisión → $76.123\n• 1% comisión → $57.435 (-$18.688)\n• 2% comisión → $43.383 (-$32.740)\n\n¡Una diferencia de 1-2% te puede costar *decenas de miles de dólares* en 30 años!\n\n🏛️ *Impuestos:* ganancias de capital, dividendos, intereses. Estrategias para minimizar:\n• Usar cuentas con ventaja fiscal\n• Mantener a largo plazo (muchos países cobran menos)\n• Compensar pérdidas con ganancias`,
    keyTakeaway: 'Pequeñas comisiones anuales se vuelven enormes con el tiempo. Busca siempre opciones de bajo costo.'
  },
  'psicologia': {
    title: 'Psicología del inversor',
    emoji: '🧠',
    body: `El mayor enemigo de tus inversiones *no es el mercado*. Eres tú misma 🧠\n\n🧠 *Los sesgos que te sabotean:*\n• *Miedo y codicia:* compramos en el pico (euforia) y vendemos en el suelo (pánico)\n• *Aversión a la pérdida:* duele el doble perder $100 que el placer de ganar $100\n• *Exceso de confianza:* después de ganar unas veces, crees que eres genia\n• *Sesgo de confirmación:* solo ves lo que confirma lo que ya crees\n• *Rebaño:* haces lo que hace la mayoría sin pensar\n\n🌋 *Las 3 trampas emocionales:*\n1. *Comprar en el pico* (cuando "todo el mundo habla de...")\n2. *Vender en el pánico* (cuando hay noticias catastróficas)\n3. *Revisar obsesivamente* (cada día genera ansiedad)\n\n🧘 *Antídotos:*\n• Ten un plan escrito y síguelo\n• Invierte de forma periódica (DCA)\n• Revisa cada 3-6 meses, no cada día\n• Automatiza tus inversiones\n\n💡 La mejor estrategia es la que *tú puedas mantener* durante décadas.`,
    keyTakeaway: 'Controla tus emociones. Una estrategia aburrida que mantienes le gana a una brillante que abandonas.'
  },
  'estrategias famosos': {
    title: 'Estrategias de los grandes',
    emoji: '👴',
    body: `Los grandes inversores de la historia coinciden en 3 cosas: paciencia, diversificación y disciplina a largo plazo.\n\n👴 *Warren Buffett* — Value investing\n_"Sé temeroso cuando otros son codiciosos, y codicioso cuando otros son temerosos."_\nCompra empresas buenas a precios razonables y mantén décadas.\n\n📚 *Jack Bogle* — Fondos indexados\n_"No busques la aguja en el pajar. Compra el pajar entero."_\nLa opción más simple y barata suele ser la mejor.\n\n🌟 *Peter Lynch* — Invertir en lo que conoces\n_"Invierte en lo que conoces. Si no puedes explicarlo en una frase, no lo compres."_\n\n🌏 *Ray Dalio* — All Weather\nCartera diversificada que funcione en cualquier clima económico.\n\n💎 *Benjamin Graham* — Value investing\n_"Compra activos por debajo de su valor intrínseco, con un margen de seguridad."_\n\n📊 Todos coincidían: paciencia a largo plazo + diversificación + comprar a buen precio.`,
    keyTakeaway: 'Paciencia, diversificación y disciplina. Lo que todos los grandes inversores tienen en común.'
  },
  'analisis fundamental': {
    title: 'Análisis fundamental',
    emoji: '🔍',
    body: `El análisis fundamental evalúa la *salud financiera real* de una empresa para saber si su precio es razonable 🔍\n\n📊 *Los 6 números que debes mirar:*\n\n1. *PER (Price/Earnings):* cuántos años de ganancias pagas por la acción\n   → Saludable: 10-20\n\n2. *EPS (Ganancias por acción):* ganancia por cada acción\n   → Saludable: positivo y creciente\n\n3. *Deuda/Patrimonio:* cuánta deuda tiene\n   → Saludable: menos de 1\n\n4. *Margen de ganancia:* cuánto de cada venta es ganancia\n   → Comparar con la industria\n\n5. *Crecimiento de ingresos:* si las ventas crecen\n   → Saludable: positivo\n\n6. *Dividend Yield:* % que paga en dividendos\n   → Saludable: 2-5%\n\n🧠 *El "moat" o foso competitivo:*\nBuffett solo invierte en empresas con ventaja duradera:\n• Marca fuerte (Apple, Coca-Cola)\n• Efectos de red (Facebook, Visa)\n• Costos bajos (Walmart)\n• Patentes (farmacéuticas)\n\n💡 Para empezar: no necesitas hacer análisis fundamental. Un fondo indexado te da exposición a cientos de empresas. Esto es para cuando ya tengas experiencia.`,
    keyTakeaway: 'Mira PER, deuda, ganancias y ventajas competitivas. Pero para empezar, los fondos indexados ya hacen esto por ti.'
  },
  'errores comunes': {
    title: 'Errores comunes',
    emoji: '❌',
    body: `Aprender de los errores ajenos es gratis. Aquí los más caros:\n\n❌ *Los 10 errores más comunes:*\n\n1. No tener fondo de emergencia\n2. Invertir dinero que necesitarás pronto\n3. Intentar "cronometrar" el mercado\n4. Buscar inversiones "milagrosas"\n5. No diversificar\n6. Seguir consejos sin entender\n7. Vender en pánico\n8. Caer en estafas\n9. Pagar comisiones altísimas\n10. No invertir nunca "porque no es el momento"\n\n🚨 *Señales de estafa:*\n• Prometen "rentabilidades garantizadas altas" (más de 10% anual sin riesgo = casi seguro estafa)\n• Te presionan para entrar "ya o perderás la oportunidad"\n• No están regulados\n• Te piden traer a más personas\n• Explicaciones vagas\n\n💡 Si suena demasiado bueno para ser verdad, es porque *no es verdad*.\n\n✅ *El antídoto:* la consistencia aburrida. La mayoría de millonarios se hicieron así: montos modestos, de forma constante, durante décadas. Es la estrategia más poderosa y la más aburrida del mundo 🐢`,
    keyTakeaway: 'Evita los errores clásicos, desconfía de promesas de riqueza rápida, y sé constante.'
  }
};

// ============================================
//  QUIZZES
// ============================================
const QUIZZES = [
  {
    q: '¿Cuál es la principal diferencia entre ahorrar e invertir?',
    opts: [
      'Son exactamente lo mismo',
      'Invertir busca mayor retorno asumiendo más riesgo; ahorrar prioriza seguridad con menor retorno',
      'Ahorrar siempre da más dinero',
      'Invertir es solo para expertos'
    ],
    correct: 1,
    explanation: 'Ahorrar = seguridad, poco retorno. Invertir = más retorno potencial pero con más riesgo. El tiempo hace que la diferencia sea enorme.'
  },
  {
    q: '¿Qué es el interés compuesto?',
    opts: [
      'Un tipo de banco que paga más',
      'Ganar intereses sobre los intereses que ya ganaste',
      'Cobrar comisiones por invertir',
      'Pagar impuestos sobre inversiones'
    ],
    correct: 1,
    explanation: 'El interés compuesto hace que tu dinero se multiplique solo. Einstein lo llamó "la octava maravilla del mundo".'
  },
  {
    q: 'Si tu cartera cae 30% en un mes, ¿qué deberías hacer (si tu horizonte es largo)?',
    opts: [
      'Vender todo inmediatamente',
      'Mantener la calma y seguir tu plan',
      'Pedir dinero prestado para invertir más',
      'Cambiar todo a criptomoneda'
    ],
    correct: 1,
    explanation: 'Si tienes horizonte largo, las caídas son normales. Vender en pánico convierte pérdidas temporales en permanentes.'
  },
  {
    q: '¿Cuánto es razonable asignar a criptomonedas?',
    opts: [
      'El 100%',
      'Máximo 5-10% como complemento',
      'El 50%',
      'No se puede invertir'
    ],
    correct: 1,
    explanation: 'La cripto es de altísimo riesgo. Como máximo 5-10% de tu cartera, solo en las más consolidadas (Bitcoin, Ethereum).'
  },
  {
    q: '¿Por qué importan tanto las comisiones?',
    opts: [
      'Son tan pequeñas que no importan',
      'Pequeñas diferencias anuales se vuelven enormes con el tiempo',
      'Solo importan si inviertes mucho',
      'Solo importan a los bancos'
    ],
    correct: 1,
    explanation: 'Una diferencia de 1% anual puede costarte decenas de miles de dólares en 30 años. Las comisiones importan muchísimo.'
  },
  {
    q: '¿Qué es un fondo indexado?',
    opts: [
      'Un fondo que elige acciones al azar',
      'Un fondo que replica un índice del mercado, con bajas comisiones',
      'Un fondo que siempre gana al mercado',
      'Un tipo de criptomoneda'
    ],
    correct: 1,
    explanation: 'Los fondos indexados replican un índice (como el S&P 500). Bajas comisiones y excelentes resultados a largo plazo.'
  },
  {
    q: '¿Qué significa diversificar?',
    opts: [
      'Invertir solo en tu país',
      'Pagar menos impuestos',
      'Repartir tu dinero en distintos activos para reducir riesgo',
      'Tener varias cuentas de banco'
    ],
    correct: 2,
    explanation: 'Diversificar = no poner todos los huevos en la misma canasta. Reduces el riesgo de perder mucho si una inversión va mal.'
  }
];

const TIPS = [
  '💡 *El mejor momento para invertir fue hace 20 años. El segundo mejor momento es hoy.* No esperes al "momento perfecto", que no existe.',
  '💡 *Paga primero a tu yo del futuro.* Automatiza tus inversiones. Aparta el dinero ANTES de que puedas gastarlo.',
  '💡 *El mercado puede mantenerse irracional más tiempo del que tú puedes mantenerte solvente.* No uses dinero que necesitas pronto.',
  '💡 *La volatilidad no es riesgo, a menos que necesites el dinero en el peor momento.* Si tienes horizonte largo, las caídas son oportunidades.',
  '💡 *Warren Buffett hizo el 99% de su fortuna después de los 50 años.* La paciencia es el superpoder más subestimado de las inversiones.',
  '💡 *El interés compuesto es el "octavo prodigio del mundo" según Einstein.* Él lo dijo, no yo. Pero coincido 💛',
  '💡 *Si alguien te ofrece "rentabilidad garantizada" alta sin riesgo, es estafa.* Punto. No hay excepciones.',
  '💡 *Tu perfil de inversor cambia con la vida.* Reevalúa cada 2-3 años.'
];

// ============================================
//  ENVÍO DE MENSAJES (WhatsApp API)
// ============================================
async function sendMessage(to, text) {
  try {
    await axios.post(API, {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: text }
    }, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
    });
  } catch (err) {
    console.error('Error enviando mensaje:', err.response?.data || err.message);
  }
}

async function sendInteractiveButtons(to, body, buttons) {
  try {
    await axios.post(API, {
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.slice(0, 3).map(b => ({
            type: 'reply',
            reply: { id: b.id, title: b.title.substring(0, 20) }
          }))
        }
      }
    }, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
    });
  } catch (err) {
    // Si falla (muchos teléfonos no soportan buttons), enviar texto
    console.error('Buttons no soportados, fallback a texto:', err.response?.data?.error?.message);
    const fallback = body + '\n\n' + buttons.map((b, i) => `${i+1}. ${b.title}`).join('\n');
    await sendMessage(to, fallback);
  }
}

async function sendList(to, body, sections) {
  try {
    await axios.post(API, {
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: body },
        action: {
          button: 'Ver temas',
          sections: sections
        }
      }
    }, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
    });
  } catch (err) {
    // Fallback a texto
    console.error('List no soportado, fallback a texto');
    let fallback = body + '\n\n';
    sections.forEach(s => {
      s.rows.forEach(r => { fallback += `• ${r.title}\n`; });
    });
    await sendMessage(to, fallback);
  }
}

// ============================================
//  IA: Llamada a Claude para preguntas libres
// ============================================
async function askAI(userMessage, user) {
  if (!USE_AI) return null;

  const systemPrompt = `Eres Sofi, una profe de finanzas personales paciente, cálida y didáctica. Tu misión es enseñar inversión a una persona que NO sabe nada de finanzas, en español, con un tono cercano y amoroso (porque fue creada por su novio para ella 💛).

REGLAS:
- Usa lenguaje simple, sin tecnicismos innecesarios. Si usas un término técnico, explícalo.
- Usa emojis para hacer el texto más amigable.
- Usa *negrita* con asteriscos para resaltar conceptos clave.
- Sé motivadora pero honesta. Nunca prometas riqueza fácil.
- Basa tus respuestas en conceptos financieros sólidos (acción, bono, fondo indexado, interés compuesto, diversificación, perfil de riesgo, inflación, etc.).
- Si la pregunta es sobre algo riesgoso (cripto especulativa, day trading, esquemas dudosos), recomienda cautela.
- Si no sabes algo con certeza, dilo.
- Respuestas cortas (máximo 4-5 párrafos). WhatsApp no es para ensayos.
- Termina invitando a seguir aprendiendo o haciendo una pregunta más.`;

  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        ...user.conversationHistory.slice(-10),
        { role: 'user', content: userMessage }
      ]
    }, {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    const reply = response.data.content[0].text;
    user.conversationHistory.push({ role: 'user', content: userMessage });
    user.conversationHistory.push({ role: 'assistant', content: reply });
    return reply;
  } catch (err) {
    console.error('Error con IA:', err.response?.data || err.message);
    return null;
  }
}

// ============================================
//  LÓGICA DE COMANDOS
// ============================================
async function handleMessage(from, text) {
  const user = getUser(from);
  user.lastInteraction = Date.now();
  const t = text.toLowerCase().trim();
  const tNoAccent = t.normalize("NFD").replace(/[̀-ͯ]/g, "");

  // ====== SALUDOS ======
  if (/^(hola|hi|hey|buenas|buenos|que tal|saludos)/.test(tNoAccent)) {
    await sendWelcome(from, user);
    return;
  }

  if (/(como estas|como vas|que tal estas|como te va)/.test(tNoAccent)) {
    await sendMessage(from, '¡Genial, gracias por preguntar! 😊 Lista para ayudarte a aprender sobre inversiones. ¿Empezamos con lo básico? Escribe *menu* para ver los temas disponibles.');
    return;
  }

  // ====== MENU ======
  if (tNoAccent.includes('menu') || tNoAccent.includes('modulos') || tNoAccent.includes('temas') || tNoAccent.includes('indice') || tNoAccent.includes('que puedo aprender') || t === 'tema') {
    await sendModuleMenu(from);
    return;
  }

  // ====== TIPS ======
  if (tNoAccent.includes('consejo') || tNoAccent.includes('tip') || tNoAccent.includes('frase') || tNoAccent.includes('motivacion')) {
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    await sendMessage(from, tip);
    return;
  }

  // ====== QUIZ ======
  if (tNoAccent.includes('quiz') || tNoAccent.includes('pregunta') || tNoAccent.includes('examen') || tNoAccent.includes('test')) {
    await startQuiz(from, user);
    return;
  }

  // ====== PROGRESO ======
  if (tNoAccent.includes('progreso') || tNoAccent.includes('avance') || tNoAccent.includes('cuanto llevo')) {
    const pct = Math.round(user.progress.size / 16 * 100);
    await sendMessage(from, `📚 Has aprendido *${user.progress.size} de 16 temas* (${pct}%). ${pct === 100 ? '¡Lo lograste, eres toda una inversora! 🏆' : '¡Sigue así! Cada tema que aprendes te acerca a tomar el control de tu futuro financiero. 💪'}`);
    return;
  }

  // ====== AYUDA ======
  if (tNoAccent.includes('ayuda') || t === 'help' || t === '?') {
    await sendHelp(from);
    return;
  }

  // ====== AGRADECIMIENTOS ======
  if (/(gracias|thanks|te lo agradezco)/.test(tNoAccent)) {
    await sendMessage(from, '¡De nada, mi amor! 💛 Aprender de finanzas es el mejor regalo que te puedes dar. Si tienes más dudas, aquí estoy. ¿Sobre qué más quieres saber?');
    return;
  }

  // ====== DESPEDIDAS ======
  if (/(adios|chao|chau|hasta luego|nos vemos|bye)/.test(tNoAccent)) {
    await sendMessage(from, '¡Hasta pronto! 💛 Recuerda: cada día que aprendes, tu yo del futuro te lo va a agradecer. ¡Aquí estaré cuando quieras seguir aprendiendo!');
    return;
  }

  // ====== RESPUESTAS DE QUIZ (A/B/C/D) ======
  if (user.awaitingQuizAnswer && /^[abcd]$/i.test(t)) {
    await answerQuiz(from, user, t.toUpperCase());
    return;
  }

  // ====== BÚSQUEDA POR TEMA ======
  for (const [key, mod] of Object.entries(MODULES)) {
    if (tNoAccent.includes(key) || tNoAccent === key.replace(/\s/g, '')) {
      await showModule(from, user, key);
      return;
    }
  }

  // ====== TEMAS ESPECIALES ======
  if (tNoAccent.includes('inflacion')) {
    await showModule(from, user, '_inflacion');
    return;
  }
  if (tNoAccent.includes('dca') || tNoAccent.includes('dollar cost') || tNoAccent.includes('inversion periodica')) {
    await showModule(from, user, '_dca');
    return;
  }
  if (tNoAccent.includes('broker') || tNoAccent.includes('plataforma') || tNoAccent.includes('donde invertir') || tNoAccent.includes('como empiezo')) {
    await showModule(from, user, '_broker');
    return;
  }

  // ====== IA: Si nada más funcionó, intentar con IA ======
  if (USE_AI) {
    await sendMessage(from, '🤔 Déjame pensar...');
    const aiReply = await askAI(text, user);
    if (aiReply) {
      await sendMessage(from, aiReply);
      return;
    }
  }

  // ====== FALLBACK ======
  await sendFallback(from);
}

// ============================================
//  MÓDULOS ESPECIALES (no están en MODULES)
// ============================================
const SPECIAL_MODULES = {
  '_inflacion': {
    title: 'La inflación',
    emoji: '📊',
    body: `La inflación es la *subida generalizada de precios* con el tiempo 📈\n\nSi la inflación es 3% anual y tu dinero solo te da 1% de interés, estás *perdiendo poder adquisitivo* aunque tengas más dinero nominal.\n\n📊 *Ejemplo:* con 3% de inflación, lo que hoy compras con $1.000 en 10 años te costará $1.344. ¡Tu dinero vale menos!\n\nPor eso es importante invertir: para que tu dinero crezca *al menos al ritmo de la inflación* y mantenga su valor real.`,
    keyTakeaway: 'La inflación hace que tu dinero pierda valor con el tiempo. Invertir es la forma de protegerte.'
  },
  '_dca': {
    title: 'DCA · Inversión periódica',
    emoji: '💰',
    body: `DCA = *Dollar Cost Averaging* (promedio de costo en dólares) 💰\n\nEs una estrategia simple: inviertes *la misma cantidad* cada mes (o semana), sin importar si el precio subió o bajó.\n\n✅ *Ventajas:*\n• Reduces el riesgo de invertir todo en el peor momento\n• Es automático y disciplinado\n• No tienes que "adivinar" cuándo comprar\n\n📊 *Ejemplo:* en lugar de meter $1.200 de golpe, metes $100 cada mes durante 12 meses. Si un mes el precio cae, tus $100 compran más unidades. Si sube, compras menos. El promedio siempre es bueno.\n\nEs la estrategia favorita de los principiantes por su simplicidad.`,
    keyTakeaway: 'Invertir la misma cantidad periódicamente, sin importar el precio. Reduce riesgo y elimina el estrés.'
  },
  '_broker': {
    title: 'Cómo empezar a invertir',
    emoji: '🏦',
    body: `Para empezar a invertir necesitas una cuenta en un *broker* (plataforma que te permite comprar y vender inversiones) 🏦\n\n✅ *Cosas que debes buscar en un broker:*\n• _Regulado_ por un organismo financiero conocido\n• _Comisiones bajas_ (idealmente $0 por operación)\n• _Buena reputación_ y muchos usuarios\n• _Fácil de usar_, especialmente si estás empezando\n• Que te permita comprar _fondos indexados_ y _ETFs_\n\n🌎 *Brokers populares:*\n• _Latinoamérica:_ GBM+, Bursanet, Trii, eToro\n• _España:_ Myinvestor, Indexa Capital, Interactive Brokers\n• _Global:_ Interactive Brokers (para mercados internacionales)\n\n⚠️ *Importante:* nunca metas dinero en plataformas que no estén reguladas. Si suena raro, desconfía.`,
    keyTakeaway: 'Busca un broker regulado, con bajas comisiones, que te permita comprar fondos indexados y ETFs.'
  }
};

// ============================================
//  FUNCIONES DE INTERACCIÓN
// ============================================
async function sendWelcome(from, user) {
  const greet = user.progress.size > 0
    ? `¡Hola de nuevo! 💛 Me alegra que vuelvas. Llevas *${user.progress.size} temas* aprendidos. ¿Seguimos donde lo dejaste?`
    : `¡Hola! 💛 *Soy Sofi*, tu profe personal de finanzas. Estoy aquí para ayudarte a aprender sobre inversión, desde lo más básico, sin enredos y sin que te aburras.`;

  await sendMessage(from, greet);
  await new Promise(r => setTimeout(r, 1200));
  await sendMessage(from, 'Te puedo enseñar 16 temas: desde qué es invertir, hasta análisis fundamental, errores comunes, etc. También puedo hacerte *quizzes*, darte *consejos*, y responder cualquier duda que tengas. 😊');
  await new Promise(r => setTimeout(r, 1200));

  await sendInteractiveButtons(from, '¿Por dónde quieres empezar?', [
    { id: 'start_basic', title: '🌱 Empezar desde cero' },
    { id: 'show_menu', title: '📚 Ver todos los temas' },
    { id: 'start_quiz', title: '🧠 Quiz rápido' }
  ]);
}

async function sendHelp(from) {
  await sendMessage(from, 'Esto es lo que puedo hacer por ti 💛\n\n📚 *Enseñarte* cualquier tema: solo escribe "acciones", "bonos", "cripto", "diversificación", etc.\n\n❓ *Responderte dudas* sobre inversiones en lenguaje normal.\n\n🧠 *Hacerte un quiz* para ver cuánto aprendiste. Escribe "quiz".\n\n💡 *Darte consejos* y frases motivadoras. Escribe "consejo".\n\n📊 *Ver tu progreso*. Escribe "progreso".\n\nSolo háblame como si fueras una amiga preguntándome algo. ¿Qué te gustaría saber? 😊');
}

async function sendModuleMenu(from) {
  const rows = Object.entries(MODULES).map(([key, mod], i) => ({
    id: `mod_${key}`,
    title: `${mod.emoji} ${mod.title}`.substring(0, 24),
    description: '' // vacío para que entre el título
  }));

  // Dividir en chunks de 10 (límite de la API)
  const chunks = [];
  for (let i = 0; i < rows.length; i += 10) {
    chunks.push(rows.slice(i, i + 10));
  }

  const sections = chunks.map((chunk, i) => ({
    title: `Temas ${i*10+1}-${i*10+chunk.length}`,
    rows: chunk
  }));

  await sendList(from, '📚 *Elige un tema para aprender:*', sections);
}

async function showModule(from, user, key) {
  const mod = (MODULES[key] || SPECIAL_MODULES[key]);
  if (!mod) return;

  user.currentModule = key;
  user.progress.add(key);

  await sendMessage(from, `${mod.emoji} *${mod.title}*`);
  await new Promise(r => setTimeout(r, 1500));
  await sendMessage(from, mod.body);
  await new Promise(r => setTimeout(r, 1500));
  await sendMessage(from, `💡 *Lo que recordar:*\n_${mod.keyTakeaway}_`);
  await new Promise(r => setTimeout(r, 1500));

  await sendInteractiveButtons(from, '¿Qué te gustaría hacer ahora?', [
    { id: 'start_quiz', title: '🧠 Hacer un quiz' },
    { id: 'show_menu', title: '📚 Ver otros temas' },
    { id: 'show_progress', title: '📊 Mi progreso' }
  ]);
}

async function startQuiz(from, user) {
  const q = QUIZZES[Math.floor(Math.random() * QUIZZES.length)];
  user.awaitingQuizAnswer = q;

  let text = `🧠 *Pregunta rápida:*\n\n${q.q}\n\n`;
  q.opts.forEach((o, i) => {
    text += `${String.fromCharCode(65+i)}) ${o}\n`;
  });
  text += '\n_Responde con A, B, C o D_';

  await sendMessage(from, text);
}

async function answerQuiz(from, user, letter) {
  const q = user.awaitingQuizAnswer;
  if (!q) return;
  user.awaitingQuizAnswer = null;

  const idx = ['A','B','C','D'].indexOf(letter);
  if (idx === -1 || idx >= q.opts.length) {
    await sendMessage(from, 'Por favor responde con A, B, C o D 😊');
    return;
  }

  const correct = idx === q.correct;
  if (correct) {
    await sendMessage(from, '🎉 *¡Correcto!* Sabes más de lo que crees 💪');
  } else {
    await sendMessage(from, `❌ *Casi.* La respuesta correcta era la *${String.fromCharCode(65+q.correct)}*: ${q.opts[q.correct]}`);
  }
  await new Promise(r => setTimeout(r, 1000));
  await sendMessage(from, q.explanation);
  await new Promise(r => setTimeout(r, 1200));

  await sendInteractiveButtons(from, '¿Qué sigue?', [
    { id: 'start_quiz', title: '🔄 Otra pregunta' },
    { id: 'show_menu', title: '📚 Aprender otro tema' },
    { id: 'show_progress', title: '📊 Ver mi progreso' }
  ]);
}

async function sendFallback(from) {
  await sendMessage(from, `Mmm, no estoy 100% segura de entender 🤔\n\nPrueba escribiendo algo como:\n• "acciones" o "bonos" para ver un tema\n• "menu" para ver todos los temas\n• "quiz" para ponerte a prueba\n• "consejo" para una frase motivadora\n\nO pregúntame algo como: "¿qué es la inflación?" o "¿cómo empiezo a invertir?" 💛`);
}

// ============================================
//  MANEJO DE INTERACTIVOS (botones/listas)
// ============================================
async function handleInteractive(from, action) {
  const user = getUser(from);

  if (action === 'start_basic') {
    await showModule(from, user, 'invertir');
  } else if (action === 'show_menu') {
    await sendModuleMenu(from);
  } else if (action === 'start_quiz') {
    await startQuiz(from, user);
  } else if (action === 'show_progress') {
    const pct = Math.round(user.progress.size / 16 * 100);
    await sendMessage(from, `📚 Has aprendido *${user.progress.size} de 16 temas* (${pct}%). ${pct === 100 ? '🏆 ¡Curso completo! Eres toda una inversora.' : '¡Sigue así!'}`);
  } else if (action && action.startsWith('mod_')) {
    const key = action.substring(4);
    await showModule(from, user, key);
  }
}

// ============================================
//  WEBHOOK (lo que Meta llama cuando llega un msg)
// ============================================
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verificado');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  // Responder inmediatamente (Meta requiere <5s)
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return;

    const msg = messages[0];
    const from = msg.from;

    if (msg.type === 'text') {
      await handleMessage(from, msg.text.body);
    } else if (msg.type === 'interactive') {
      const action = msg.interactive?.button_reply?.id
                  || msg.interactive?.list_reply?.id;
      if (action) await handleInteractive(from, action);
    }
  } catch (err) {
    console.error('Error en webhook:', err);
  }
});

// ============================================
//  HEALTH CHECK
// ============================================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    bot: 'Sofi - Finanzas para mi amor',
    ia_activa: USE_AI,
    usuarios: users.size,
    modulos: Object.keys(MODULES).length
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`💛 Sofi escuchando en puerto ${PORT}`);
  console.log(`🤖 IA real: ${USE_AI ? '✅ Activada' : '❌ Solo respuestas pre-programadas'}`);
  console.log(`📚 ${Object.keys(MODULES).length} módulos cargados`);
});
