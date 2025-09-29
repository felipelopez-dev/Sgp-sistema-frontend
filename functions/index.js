const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.limparHistorico = functions.pubsub.schedule('0 0 * * *')
  .onRun(async (context) => {
    const db = admin.database();
    const historicoRef = db.ref('historico');

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const snapshot = await historicoRef.once('value');
    let cardsParaDeletar = {};
    let count = 0;

    snapshot.forEach((childSnapshot) => {
      const card = childSnapshot.val();
      const cardKey = childSnapshot.key;

      const [day, month, year] = card.date.split('/');
      const cardTimestamp = new Date(`${year}-${month}-${day}`).getTime();

      if (cardTimestamp < sevenDaysAgo) {
        cardsParaDeletar[cardKey] = null;
        count++;
      }
    });

    if (count > 0) {
      await historicoRef.update(cardsParaDeletar);
      console.log(`Cloud Function: ${count} cards com mais de 7 dias foram removidos do histórico.`);
    } else {
      console.log('Cloud Function: Nenhum card antigo encontrado para remover.');
    }

    return null;
  });