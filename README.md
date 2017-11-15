# fran-botherer
a bot for bothering bad-bloggers

# what?
This repo serves to house my Twitter bot away from Glitch (and to see exactly how import/export works)

The bot itself I started a while back (remixed from an existing Glitch boilerplate) and rarely touch now, but it checks a Blogspot RSS feed specified in the `.env` and picks from a short list of messages to tweet if it doesn't find a blog this week (the post needs to be from within 5 days of the 'blogging day' and the check happens at midday GMT, if you want a different time, remix it).

The `.env` should also include your Twitter App credentials and the Twitter account and birthday of that Twitter user (did I mention it wishes them a happy birthday?)

You'll also need something like an Uptime Robot account to probe the endpoint. When the correct conditions are met, it sends a tweet. I do it hourly, any more and it'll send a load of tweets at once (it has done that before). There's also some helper paths to test stuff out so you know your Twitter bot config is working or whatever.

Remix it here: https://glitch.com/edit/#!/remix/fran-botherer

# who's fran?
Someone who doesn't manage to blog every week (and doesn't mind being tweeted about it)
