const {Client, Intents} = require("discord.js")
const mongoose = require('mongoose')
const config = require("./config.json");
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, 
                                      Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS]})

// connecting to the DB on our side
mongoose.connect('mongodb://localhost:27017/basedcountbot', {
  useUnifiedTopology: true,
  useNewUrlParser: true
})

//building what is stored in the individual based users- user will be name + guild for separation of pills
const basedMember = new mongoose.Schema({
  user: String,
  pills: Array,
  count: {
    type: Number,
    default: 0
  } 
})

//creating the based table, ready for use in functions
const theBased = mongoose.model('based', basedMember);

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on("message", msg => {
  if(msg.author != client.user){
    if(msg.author.id == config.builderID){
      //I am the master, if content is killBot it will die
      if(msg.content == "killBot") {
        client.destroy();
        mongoose.connection.close()
      }
    }
    console.log(msg.content)
    text = msg.content.toLowerCase()
    if (text.includes("based") || text.includes("baste")) {
      //make a hash of the guild and the userID
      //see if there is an entry in the DB
      //if not, make a new entry and increase the count and pills as necessary
      if(msg.type != "REPLY"){
        selfReplyResLength = config.selfReplies.length
        replyMessage = Math.floor(Math.random() * selfReplyResLength);
        msg.reply(config.selfReplies[replyMessage])
      }
      else{
        hash = msg.author.id + msg.guildId
        console.log("valid pill can be given to " + hash)
      }
    }
  }
})

client.login(config.token)