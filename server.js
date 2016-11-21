var restify = require('restify');
var builder = require('botbuilder');
var numeral = require('numeral');

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log('%s listening to %s', server.name, server.url); 
});
  
var connector = new builder.ChatConnector({
  appId: "bc40c9c0-9319-4265-941c-0bcfeab0c119",
  appPassword: "CoSACNgb6kzkT0kfhK3uVm0"
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

var LUIS_URL = 'https://api.projectoxford.ai/luis/v1/application?id=6873493d-2816-4d0b-a08b-12c32b46ccf5&subscription-key=75ae07283a0949fbaae5792e8dc157b4&q=';
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
      builder.Prompts.choice(session, "請問您要查詢哪種匯率？", ["美元", "日圓", "人民幣"]);
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
    var sourceEntity = builder.EntityRecognizer.findEntity(results.entities, "source");
    var destinationEntity = builder.EntityRecognizer.findEntity(results.entities, "destination");
    var amountEntity = builder.EntityRecognizer.findEntity(results.entities, 'builtin.number');
    var amount = amountEntity.entity;

    if (singleEntity != null) {
      var single = singleEntity.entity;
      var exchange = getExchange(single);
      if (exchange) {
        session.send("換%s的%s要%s元", numeral(amount).format('0,0'), single, numeral(amount * exchange).format('0,0'));
      } else {
        session.send("目前不提供%s的換匯哦", single)
      }
    } else if (!destinationEntity && sourceEntity) {
      var single = sourceEntity.entity;
      var exchange = getExchange(single);
      if (exchange) {
        session.send("換%s的%s要%s元", numeral(amount).format('0,0'), single, numeral(amount * exchange).format('0,0'));
      } else {
        session.send("目前不提供%s的換匯哦", single)
      }
    } else {
      var source = sourceEntity.entity;
      var destination = destinationEntity.entity;
      var sourceExchange = getExchange(source);
      var destinationExchange = getExchange(destination);
      if (sourceExchange == undefined) {
        session.send("目前不提供%s的換匯哦", source)
      } else if (destinationExchange == undefined) {
        session.send("目前不提供%s的換匯哦", destination)
      } else {
        var total = numeral(amount * sourceExchange / destinationExchange).format('0,0');
        session.send("%s的%s可以換到%s的%s",numeral(amount).format('0,0'), source, total, destination);
      }
    }
  }
]);