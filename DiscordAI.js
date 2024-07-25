//Discord AI bot - need to wait 48 hours for it to work due to free trial - 7/11/24


require('dotenv/config')
const { Client } = require('discord.js')
const { OpenAI } = require('openai')

//video has a comma after bracket in MessageContent, accident?
const client = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent']
})

client.on('ready', () => {
    console.log('The bot is online.')
})

//ignores any messages starting with !
const IGNORE_PREFIX = "!"
const CHANNELS = ['1261008384476577855']

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
})

client.on('messageCreate', async (message) => {
    if (message.author.bot) return
    if (message.content.startsWith(IGNORE_PREFIX)) return
    if (!CHANNELS.includes(message.channelId) && !message.mentions.users.has(client.user.id)) return

    await message.channel.sendTyping()

    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping()
    }, 5000)

    let conversation = []
    conversation.push({
        role: 'system',
        content: 'ChatGPT is friendly'
    })

    let prevMessages = await message.channel.messages.fetch({ limit: 10 })
    prevMessages.reverse()

    prevMessages.forEach((msg) => {
        if (msg.author.bot && msg.author.id !== client.user.id) return
        if (msg.content.startsWith(IGNORE_PREFIX)) return

        const username = msg.author.username.replace(/\s+/g, '_').replace(/[\w\s]/gi, '')

        if (msg.author.id === client.user.id) {
            conversation.push({
                role: 'assistant',
                name: username,
                content: msg.content
            })

            return

        }

        conversation.push({
            role: 'user',
            name: username,
            content: msg.content
        })
    })

    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
            {
                //name: 
                role: 'system',
                content: 'Chat GPT is here!'
            }, 
            {
                role: 'user',
                content: message.content
            }
        ]
    }).catch((error) => console.error('OpenAI Error: \n', error))

    clearInterval(sendTypingInterval)

    if (!response) {
        message.reply("I'm struggling with the OpenAI API! Try again in a bit")
        return
    }

    const responseMessage = response.choices[0].message.content
    const chunkSizeLimit = 2000

    for(let i = 0; i < responseMessage.length; i+= chunkSizeLimit){
        const chunk = responseMessage.substring(i, i + chunkSizeLimit)
        await message.reply(chunk)

    }


    message.reply(response.choices[0].message.content)
})

client.login(process.env.TOKEN)
