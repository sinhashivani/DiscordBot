const mongoose = require('mongoose');
const { Client, Intents } = require('discord.js');
require('dotenv/config')

const mongoURI = process.env.MONGO_URI

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });


const messageSchema = new mongoose.Schema({
    messageId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    content: { type: String, required: true },
    url: { type: String, required: true },
});

const SavedMessage = mongoose.model('SavedMessage', messageSchema);
const client = new Client({
    intents: ['Guilds', 'GuildMessages', 'GuildMessageReactions', 'MessageContent']
})
const TARGET_EMOJI = '📌'

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});



client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.emoji.name === TARGET_EMOJI && !user.bot) {
        const message = reaction.message;

        console.log('Message received for saving');

        // Check if the message is already saved
        const existingMessage = await SavedMessage.findOne({ messageId: message.id });
        if (existingMessage) {
            console.log('Message already saved');
            return;
        }

        // Save the message to the database
        const savedMessage = new SavedMessage({
            messageId: message.id,
            userId: message.author.id,
            username: message.author.username,
            content: message.content,
            url: message.url,
        });

        await savedMessage.save();
        message.channel.send(`Message saved for user ${message.author.username}: ${message.content}`);
        console.log(`Message saved: ${JSON.stringify(savedMessage, null, 2)}`);
    }
});

client.on('messageCreate', async (message) => {
    //will not return messages for bots
    if (message.author.bot) return;

    //saves message (anyone can save for any user except bots)
    if (message.content.startsWith('!saved')) {
        const args = message.content.split(' ').slice(1);
        const userIdOrName = args.join(' ');

        // Find user by ID or username
        const user = client.users.cache.find(user => user.id === userIdOrName || user.username === userIdOrName);
        if (!user) {
            message.channel.send('User not found.');
            return;
        }

        // Retrieves saved messages for a user
        const savedMessages = await SavedMessage.find({ userId: user.id });
        if (savedMessages.length === 0) {
            message.channel.send('No saved messages for this user. 1');
            return
        } else {
            const savedMessageContent = savedMessages
                .map((msg, index) => `${index + 1}. ${msg.content} (Link: ${msg.url})`)
                .join('\n');
            message.channel.send(savedMessageContent);
            return
        }
    }

    //erases a saved message (only if the user requests it)
    if(message.content.startsWith('!erase')) {
        const args = message.content.split(' ').slice(1);
        const index = parseInt(args[0], 10) - 1; // Adjusted to parse the index correctly

        if (isNaN(index)) {
            message.channel.send('Please provide a valid message number to erase.');
            return;
        }

        const user = message.author
        const savedMessages = await SavedMessage.find({ userId: user.id }); //changed from authorId to userId
        
        if (savedMessages.length === 0) {
            message.channel.send('No saved messages for this user. 2');
            return
        } else if (index >= 0 && index < savedMessages.length) {
            const messageToDelete = savedMessages[index].messageId
            
            await SavedMessage.deleteOne({ messageId: messageToDelete })
            message.channel.send('Message erased.')   
            return         
        } else {
            message.channel.send('Invalid message number.') 
            return
        }
        
    }
});

client.login(process.env.TOKEN)
