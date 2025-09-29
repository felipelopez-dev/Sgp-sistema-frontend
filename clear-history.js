const admin = require('firebase-admin');
const moment = require('moment');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pausaprogramada-943e2-default-rtdb.firebaseio.com"
});

const db = admin.database();
const historicoRef = db.ref('historico');

const DAYS_TO_KEEP = 60; 

console.log('Iniciando limpeza do histórico...');

historicoRef.once('value', (snapshot) => {
    let count = 0;
    const updates = {};
    const today = moment().startOf('day');

    snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        const key = childSnapshot.key;
        
        const [day, month, year] = data.date.split('/');
        const recordDate = moment(`${year}-${month}-${day}`);
        
        const diffDays = today.diff(recordDate, 'days');

        if (diffDays >= DAYS_TO_KEEP) {
            updates[key] = null;
            count++;
        }
    });

    if (count > 0) {
        historicoRef.update(updates)
            .then(() => {
                console.log(`Limpeza concluída! ${count} registros com mais de ${DAYS_TO_KEEP} dias foram removidos.`);
                process.exit(0);
            })
            .catch((error) => {
                console.error('Erro durante a limpeza:', error);
                process.exit(1);
            });
    } else {
        console.log(`Nenhum registro com mais de ${DAYS_TO_KEEP} dias foi encontrado. Nenhuma ação necessária.`);
        process.exit(0);
    }
}, (errorObject) => {
    console.log('A leitura falhou: ' + errorObject.name);
    process.exit(1);
});