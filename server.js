/* Setting things up. */
var path = require('path'),
    express = require('express'),
    app = express(),   
    Twit = require('twit'),
    config = {
    /* Be sure to update the .env file with your API keys. See how to get them: https://botwiki.org/tutorials/how-to-create-a-twitter-app */      
      twitter: {
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token: process.env.ACCESS_TOKEN,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET
      }
    },
    T = new Twit(config.twitter),
    stream = T.stream('statuses/sample'),
    FeedParser = require('feedparser'),
    request = require('request'),
    moment = require('moment-timezone'),
    phrases = require('./phrases.json'),
    praises = require('./praises.json');
moment.tz.setDefault(process.env.TIMEZONE||'Europe/London');
app.use(express.static('public'));

const signed = `\n(❤️🤖)${process.env.HASHTAG?'\n#'+process.env.HASHTAG:''}`

/* You can use uptimerobot.com or a similar site to hit your /BOT_ENDPOINT to wake up your app and make your Twitter bot tweet. */

app.all("/" + process.env.BOT_ENDPOINT, function (request, response) {//console.log(moment(),afterMidday(moment()))
  if(/str/.test(typeof request.query.says)){ //check if it /exists/, because we might want it empty
    console.log(request.query)
    sendTweet({status:`${/str/.test(typeof request.query.at)?'@'+request.query.at+', ':''}bot says:\n${request.query.says||'hello'}${signed}`}, response)
    return;
  }
  else if(/str/.test(typeof request.query.draws)&&request.query.draws.length){ //check if it /exists/, because we might want it empty
    console.log(request.query)
    drawTweet(
      request.query.draws,
      {status:`bot would like to share this image with you${signed}`},
      response
    )
    
    return;
  }
  else if(/str/.test(typeof request.query.day)){
    sendTweet({ status: `Today is ${moment().format('dddd')}, right?` }, response)
    return;
  }
  else if(process.env.BIRTHDAY && moment().format('DD/MM')==process.env.BIRTHDAY && moment().isSameOrAfter(moment('7:00','H:mm'),'minute') && moment().isBefore(moment('8:00','H:mm'),'minute')){
    sendTweet({ status: `@${process.env.ACCOUNT_TO_BOTHER}, Happy Birthday! 🎂🎉${signed}` }, response)
    return;
  }
  else if(checkDay(process.env.BLOG_DAY) && afterMidday() && moment().isBefore(moment('13:00','H:mm'),'minute')){
    //checking it's after midday London time, that'll be our grace period
    //got an hour window for checking every hour, but maybe I should be
    //using a 2 hour window, so we can reasonably check every hour and a half
    requestRSS(process.env.RSS_TO_CHECK,2).then(function(items){
      compareDates(items[0]./*meta.*/pubdate)?
        (//so we know that there's been a post this week, now check if the 2nd most recent was this week too (be more generous)
          items[1] && compareDates(items[1]./*meta.*/pubdate,6)?
            sendTweet({status:`@${process.env.ACCOUNT_TO_BOTHER} ${praises[Math.floor(Math.random()*praises.length)]}${signed}`}, response):
            response.send('#ispyblog 🎉')
        ) :
        sendTweet({status:`@${process.env.ACCOUNT_TO_BOTHER} ${phrases[Math.floor(Math.random()*phrases.length)]}${signed}`}, response)
      //response.send([compareDates(item.meta.pubdate)?'Last post was today':'Last post was not today',item.meta,phrases])
    },()=>response.sendStatus(500));
    return;
    //TODO: post images occasionally like this one: https://cdn.glitch.com/c7194ac9-cad5-47ba-9838-8b3d4fb79ccd%2FScreen%20Shot%202017-08-17%20at%2009.52.45.png?1502960905759
  }
  else response.send("Don't tweet right now");
});

function sendTweet(tweet,response){
  var resp = response;
  T.post('statuses/update', tweet, function(err, data, response) {
    if (err&&!err.draw){ //code 187
      resp.sendStatus(err.code&&err.code==187?err.statusCode:500);
      console.log('Error!');
      console.log(err);
    }
    else{
      //pubdate
      resp.sendStatus(200);
    }
  });
}

function drawTweet(imgURL,tweet,response,altText = "bot shared image"){ //TODO: handle base64 encoded dataURIs
  request({url: imgURL, encoding: 'base64'}, function (err, res, body) {
        if (!err && res.statusCode == 200) {
            // first we must post the media to Twitter
            T.post('media/upload', { media_data: body }, function (err, data, response) {
              // now we can assign alt text to the media, for use by screen readers and
              // other text-based presentations and interpreters
              var mediaIdStr = data.media_id_string
              //var altText = "bot shared image"
              var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }
            
              T.post('media/metadata/create', meta_params, function (err, data, _response) {
                if (!err) {
                  sendTweet({status:tweet.status, media_ids: [mediaIdStr]}, response)
                }
                else response.sendStatus(500)
              })
            })
        } else {
            response.sendStatus(500)
        }
    });
}

app.all("/" + 'feed', function (_req, response) {
  requestRSS(process.env.RSS_TO_CHECK,response).then(function(item){
    response.send([compareDates(item.meta.pubdate)?'Last post was recent':'Last post was not recent',item/*.meta*/,phrases])
  });
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your bot is running on port ' + listener.address().port);
});

function compareDates(date,earlyBy=4){
  // What if it's early? Check for just under a week
  //return moment(date).isSameOrAfter(Date.now(), 'day')
  return (
    //moment(date).isSameOrBefore(moment(), 'day')
    //&&
    moment(date).isSameOrAfter(moment().subtract(earlyBy,'days'), 'day')
    //Friday - 4 days == Monday
  )
  //var postedDay = parseInt(moment(day,'dddd').format('d'))
  //var today = parseInt()
}

function checkDay(day){
  // checking one day is all well and good, but what if it's early?
  return day.toLowerCase() === moment().format('dddd').toLowerCase()
}

function afterMidday(mom){
  //mom = mom||moment()
  return (mom||moment()).isAfter(moment('12:00','H:mm'),'minute')
}

function requestRSS(url,response,postsRequired=1){return new Promise(function(resolve,reject){
  var req = request(url)//request(process.env.RSS_TO_CHECK)
  var feedparser = new FeedParser({});

  req.on('error', error);
  feedparser.on('error', error);

  req.on('response', function (res) {
    var stream = this; // `this` is `req`, which is a stream

    if (res.statusCode !== 200) {
      this.emit('error', new Error('Bad status code'));
    }
    else {
      stream.pipe(feedparser);
    }
  });
  
  feedparser.on('readable', function () {
    // This is where the action is!
    var stream = this; // `this` is `feedparser`, which is a stream
    var meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
    var item;
    var allItems=[];
    //return stream.read();
    while (item = stream.read()) {
    //while (!item) {
      //console.log(Object.keys(item));
      //console.log(item.title)
      // each item is a post, the first being the most recent post, which is realistically all we need
      // so by resolving we break out of the loop and return just the most recent for date comparison
      // meta gives the most recent update as the time stamp, which again is fine for our purposes
      if(postsRequired==1)resolve(item);
      allItems.push(item);
      if(allItems.length>=postsRequired)resolve(allItems)
    }
    //resolve(allItems[0]);
    //console.log(item.meta)
    //return item;
    //response.send(allItems);
  });
  
  function error(e){console.error(e)}
})}
