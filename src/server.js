var restify = require('restify');
var builder = require('botbuilder');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());


//=========================================================
// Bots Dialogs
//=========================================================
var LUIS_URL = 'https://api.projectoxford.ai/luis/v1/application?id=4ee4485b-081b-4557-b21d-4d062d97eeff&subscription-key=75ae07283a0949fbaae5792e8dc157b4&q=';
var recognizer = new builder.LuisRecognizer(LUIS_URL);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', intents);

var exchangeRate = {
  "美元": 31.94000,
  "日圓": 0.28700,
  "人民幣": 4.61600,
  "台幣": 1.00000
}

function getExchange(type) {
  return exchangeRate[type]
}

intents.onDefault(builder.DialogAction.send("很抱歉我不確定您想做什麼？試試[現在美元匯率」或「我有1000美金可以換多少台幣」"));

intents.matches('查詢匯率', [
  function (session, results, next) {
    var typeEntity = builder.EntityRecognizer.findEntity(results.entities, "幣別");
    console.log(typeEntity);
    var exchangeType = session.dialogData.exchangeType = typeEntity ? typeEntity.entity : null;

    if (exchangeType === null) {
      builder.Prompts.choice(session, "請問您要查詢哪種假？", ["美元", "日圓", "人民幣"]);
    } else {
      next();
    }
  },
  function (session, results) {
    var exchangeType = session.dialogData.exchangeType;
    if (results.response) {
      vacationType = results.response.entity;
    }
    console.log("exhange", getExchange(exchangeType));
    session.send("現在%s兌台幣是1:%f", exchangeType, getExchange(exchangeType));
  }
]);

intents.matches('換匯', [
  function (session, results, next) {

    var singleEntity = builder.EntityRecognizer.findEntity(results.entities, "幣別");
    var sourceEntity = builder.EntityRecognizer.findEntity(results.entities, "幣別::source");
    var destinationEntity = builder.EntityRecognizer.findEntity(results.entities, "幣別::destination");
    var amountEntity = builder.EntityRecognizer.findEntity(results.entities, 'builtin.number');
    
    console.log("singleEntity", singleEntity);
  
    if (singleEntity != null) {
      var single = singleEntity.entity;
      var exchange = getExchange(single);
      var amount = amountEntity.entity;
      if (exchange) {
        session.send("換%d的%s要%d元", amount, single, amount * exchange);
      } else {
        session.send("目前不提供%s的換匯哦", single)
      }
    } else {
      var source = sourceEntity.entity;
      var destination = destinationEntity.entity;
      var sourceExchange = getExchange(source);
      var destinationExchange = getExchange(destination);
      var amount = amountEntity.entity;

      if (sourceExchange == undefined) {
        session.send("目前不提供%s的換匯哦", source)
      } else if (destinationExchange == undefined) {
        session.send("目前不提供%s的換匯哦", destination)
      } else {
        session.send("%d的%s可以換到%d的%s", amount, source, amount * sourceExchange / destinationExchange, destination);
      }
    }
  }
]);


bot.dialog('/exhange', [
  function(session, args, next) {
    console.log(args);
    session.dialogData.args = args;
    session.dialogData.order = {};
    var lunchboxType = builder.EntityRecognizer.findEntity(args.entities, '便當');
    if (!lunchboxType) {
      builder.Prompts.text(session, '請問你今天想吃什麼飯');
    } else {
      session.dialogData.order.lunchboxType = lunchboxType.entity;
      next();
    }
  },
  function (session, results, next) {
    if (results.response) {
      session.dialogData.order.lunchboxType = results.response;
    } 
    var quantity = builder.EntityRecognizer.findEntity(session.dialogData.args.entities, 'builtin.number');
    if (!quantity) {
      builder.Prompts.number(session, "請問你想要訂幾個" + session.dialogData.order.lunchboxType);
    } else {
      session.dialogData.order.quantity = quantity.entity;
      next();
    }
  },
  function(session, results) {
    if (results.response) {
      session.dialogData.order.quantity = results.response;
    }
    var total = parseInt(session.dialogData.order.quantity) * 90;
    session.send("%d個%s總共要%d元",session.dialogData.order.quantity, session.dialogData.order.lunchboxType, total);
    session.endDialog();
  }
]);
