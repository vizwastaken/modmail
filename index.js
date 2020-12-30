const { prefix, token, mongooseString } = require('./config.json')
const fs = require('fs')
const mongoose = require('mongoose')
mongoose.connect(mongooseString, {
  useUnifiedTopology: true,
  useNewUrlParser : true
})

const db = new mongoose.model('modmail-transcript',
    new mongoose.Schema({
        AuthorID : String,
        Content: Array
})
)
const { Client, Message, MessageEmbed, MessageAttachment } = require('discord.js')
const bot = new Client();

  const activities = ["dm for help","discord.gg/celestianime"];
  setInterval(() => {
    let activity = activities[Math.floor(Math.random() * activities.length)];
    bot.user.setActivity(activity, { type: "WATCHING" });
  }, 20000);

bot.on('ready', () => {
  console.log(`${bot.user.username} is ready!`)
})

/**
* @param {Message} message
* @param {Client} bot
*/

bot.on('message', async(message) => {
  if(message.author.bot) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/g)
  
  console.log(message.author.tag + " : " + message.content)
  
  const mainGuild = bot.guilds.cache.get('YOUR GUILD IDs')
  const mainCategory = 'YOUR MODMAIL CATEGORY CHANNEL IDs'
  const modmailLogs = mainGuild.channels.cache.get('YOUR MODMAIL CHANNEL LOGS IDs')
  
  if(message.channel.type === 'dm') {
    console.log(1)
    checkAndSave(message)
    const checkChannel = !!mainGuild.channels.cache.find(ch => ch.name === message.author.id)
    if(checkChannel === true) {
      const mailChannel = await mainGuild.channels.cache.find(ch => ch.name === message.author.id)
      
      if(message.attachments && message.content === '') {
        mailChannel.send(new MessageEmbed()
            .setAuthor(message.author.tag, message.author.displayAvatarURL({ dynamic : true }))
            .setColor('RANDOM')
            .setImage(message.attachments.first().proxyURL)
            .setTimestamp()
        )
      } else {
        mailChannel.send(new MessageEmbed()
            .setAuthor(message.author.tag, message.author.displayAvatarURL({ dynamic : true }))
            .setColor('RANDOM')  
            .setTimestamp()
            .setDescription(message.content)
      )
      }
      
    } else if(checkChannel === false) {
        const mailChannel = await mainGuild.channels.create(message.author.id, {
          type : 'text',
          parent: mainCategory,
          permissionOverwrites: [
            {
              id : mainGuild.id,
              deny: ['VIEW_CHANNEL']
            }
          ]
        })
        modmailLogs.send(new MessageEmbed()
          .setDescription(`**${message.author.tag}** has created a modmail thread -> ${mailChannel}`).setColor('GREEN')
          
        )
        if(message.attachments && message.content === '') {
            mailChannel.send(new MessageEmbed()
            .setAuthor(message.author.tag, message.author.displayAvatarURL({ dynamic: true }))
            .setColor('RANDOM')
            .setImage(message.attachments.first().proxyURL)
            .setTimestamp()
      )
      } else {
            mailChannel.send(new MessageEmbed()
            .setAuthor(message.author.tag, message.author.displayAvatarURL({ dynamic: true }))
            .setColor('RANDOM')  
            .setTimestamp()
            .setDescription(message.content)
      )
      }
    }
  }
  if(!message.guild) return;
  if(message.guild.id === mainGuild.id && message.channel.parentID === mainCategory) {
    if(message.content === prefix + "close") {
      message.channel.send('Deleting in 5 seconds')
      
      setTimeout(() => {
        bot.users.cache.get(message.channel.name).send(new MessageEmbed().setDescription('Your ticket has been closed by a moderator!').setColor('RED'))
        message.channel.delete().then(ch => {
          modmailLogs.send(new MessageEmbed().setColor('RED').setDescription(`**${bot.users.cache.get(ch.name).tag}** modmail thread has been closed!`))
        })
        sendTranscriptAndDelete(message, modmailLogs)
      }, 5000)
      return;
    } else if(message.content === prefix + "no") return;
    db.findOne({ AuthorID : message.channel.name }, async(err, data) => {
      if(err) throw err;
      if(data) {
        if(message.attachments && message.content === '') {
          data.Content.push(`${message.author.tag} : ${message.attachments.first().proxyURL}`)
        } else {
          data.Content.push(`${message.author.tag} : ${message.content}`)
        }
        data.save()
      }
    })
    
    const user = bot.users.cache.get(message.channel.name)
    
    if(message.attachments && message.content === '') {
            user.send(new MessageEmbed()
            .setAuthor(message.author.tag, message.author.displayAvatarURL({ dynamic: true }))
            .setColor('RANDOM')
            .setImage(message.attachments.first().proxyURL)
            .setTimestamp()
      )
      } else {
            user.send(new MessageEmbed()
            .setAuthor(message.author.tag, message.author.displayAvatarURL({ dynamic: true }))
            .setColor('RANDOM')  
            .setTimestamp()
            .setDescription(message.content)
      ) 
      }
  }
})


function checkAndSave(message) {
  db.findOne({ AuthorID: message.author.id }, async(err, data) => {
    if(err) throw err;
    if(data) {
      if(message.attachments && message.content === '') {
        data.Content.push(`${message.author.tag} : ${message.attachments.first().proxyURL}`)
      } else {
        data.Content.push(`${message.author.tag} : ${message.content}`)
      }
    } else {
      if(message.attachments && message.content === '') {
        data = new db({
          AuthorID : message.author.id,
          Content : `${message.author.tag} : ${message.attachments.first().proxyURL}`
        })
      } else {
        data = new db({
          AuthorID : message.author.id,
          Content : `${message.author.tag} : ${message.content}`
        })
      }
    }
    data.save()
  })
}

async function sendTranscriptAndDelete(message, channel) {
  db.findOne({ AuthorID : message.channel.name }, async(err, data) => {
    if(err) throw err;
    if(data) {
      fs.writeFileSync(`../${message.channel.name}.txt`, data.Content.join("\n"))
      await channel.send(new MessageAttachment(fs.createReadStream(`../${message.channel.name}.txt`)))
      fs.unlinkSync(`../${message.channel.name}.txt`)
      await db.findOneAndDelete({ AuthorID : message.channel.name })
    }
  })
}

bot.login(token)