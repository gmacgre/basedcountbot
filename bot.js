const {Client, Intents} = require("discord.js")
const mongoose = require('mongoose')
const config = require("./config.json");
const responses = require("./responses.json")
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

//set up a message for replying to the giving of a pill
//"X is officially based! Their current count is Y"
//"Pills: ...."
//include the currently added pill as well
function formatMessage(basedUser, discordUser){
  let str = ""
  str += "**" +  discordUser.username + " is officially based!**\n";
  str += "Their based count is now " + basedUser.count + ".\n";
  str += "Pills: ";
  for(let i = 0; i < basedUser.pills.length; i++){
    str += basedUser.pills[i]
    if(i + 1 != basedUser.pills.length){
      str += ", "
    }
  }
  str += "\n"
  return str;
}

//creating the based table, ready for use in functions
const theBased = mongoose.model('based', basedMember);

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on("messageCreate", async (msg) => {
  console.log("HELLO!")
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
      
      //see if there are mentions- either the ping is first followed by based/baste
      //or based/baste MUST be the first word mentioned
      //return early if satisfaction is not met


      //parse out pills

      if(msg.type == "REPLY"){
        rephash = msg.mentions.repliedUser.id + msg.guildId;
        userhash = msg.author.id + msg.guildId;
        //console.log("valid pill can be given to " + rephash);
        //console.log("Our hash is " + userhash);
        if(rephash == userhash){
          selfReplyResLength = responses.selfReplies.length
          replyMessage = Math.floor(Math.random() * selfReplyResLength);
          msg.reply(responses.selfReplies[replyMessage])
        }
        else{
          //valid giving of a pill
          //go into the database, and set up a user if needed
          //increment the based count, add pills as needed
          //post giant listing of pills/count
          let basedUser = await theBased.findOne({ user: rephash });
          if(basedUser == null){
            console.log("User didn't have a profile, making one for them")
            const basedUserNew = new theBased({ user: rephash, pills: [] });
            basedUser = basedUserNew;
          }
          basedUser.count += 1;
          await basedUser.save();
          let messageBack = formatMessage(basedUser,msg.mentions.repliedUser);
          msg.reply(messageBack);
        }
      }
    }
  }
})

client.login(config.token)