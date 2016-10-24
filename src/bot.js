'use strict';

const CommandHandler = require('./CommandHandler.js');
const Discord = require('discord.js');
const md = require('node-md-config');
const defaultLogger = require('./logger.js');

/**
 * A collection of strings that are used by the parser to produce markdown-formatted text
 * @typedef {Object.<string>} MarkdownSettings
 * @property {string} lineEnd      - Line return character
 * @property {string} blockEnd     - Block end string
 * @property {string} doubleReturn - Double line return string
 * @property {string} linkBegin    - Link begin string
 * @property {string} linkMid      - Link middle string
 * @property {string} linkEnd      - Link end string
 * @property {string} bold         - String for denoting bold text
 * @property {string} italic       - String for denoting italicized text
 * @property {string} underline    - String for denoting underlined text
 * @property {string} strike       - String for denoting striked-through text
 * @property {string} codeLine     - String for denoting in-line code
 * @property {string} codeBlock    - String for denoting multi-line code blocks
 */

/**
 * Class describing Genesis bot
 */
class Genesis {
  /**
   * @param  {string}           discordToken         The token used to authenticate with Discord
   * @param  {Raven.Client}     ravenClient          The client used to report errors to Sentry
   * @param  {Object}           [options]            Bot options
   * @param  {number}           [options.shardID]    The shard ID of this instance
   * @param  {number}           [options.shardCount] The total number of shards
   * @param  {string}           [options.prefix]     Prefix for calling the bot
   * @param  {MarkdownSettings} [options.mdConfig]   The markdown settings
   * @param  {Logger}           [options.logger]     The logger object
   */
  constructor(discordToken, ravenClient, { shardID = 0, shardCount = 1, prefix = '/', mdConfig = md,
    logger = defaultLogger, owner = null } = {}) {
    /**
     * The Discord.js client for interacting with Discord's API
     * @type {Discord.Client}
     * @private
     */
    this.client = new Discord.Client({
      fetch_all_members: true,
      api_request_method: 'burst',
      ws: {
        compress: true,
        large_threshold: 1000,
      },
      shard_id: shardID,
      shard_count: shardCount,
    });

    /**
     * Discord login token for is bot
     * @type {string}
     * @private
     */
    this.token = discordToken;

    /**
     * The logger object
     * @type {Logger}
     * @private
     */
    this.logger = logger;

    /**
     * Raven Client for reporting errors to Sentry
     * @type {Raven.Client}
     * @private
     */
    this.ravenClient = ravenClient;

    /**
     * Prefix for calling the bot
     * @type {string}
     * @private
     */
    this.prefix = prefix.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    /**
     * The markdown settings
     * @type {MarkdownSettings}
     * @private
     */
    this.md = mdConfig;

    /**
     * Whether or not the bot is ready to execute.
     * This allows stopping commands before servers and users are ready.
     * @type {boolean}
     */
    this.readyToExecute = false;

    /**
     * Command handler for this Bot
     * @type {CommandHandler}
     * @private
     */
    this.commandHandler = new CommandHandler(this);

    /**
     * The bot's owner
     * @type {string}
     */
    this.owner = owner;

    this.client.on('ready', () => this.onReady());
    this.client.on('guildCreate', guild => this.onGuildCreate(guild));
    this.client.on('message', message => this.onMessage(message));
  }

  /**
   * Logs in the bot to Discord
   */
  start() {
    this.client.login(this.token)
      .then((t) => {
        this.logger.debug(`Logged in with token ${t}`);
      })
      .catch((e) => {
        this.logger.fatal(e);
        process.exit(1);
      });
  }

  /**
   * Perform actions when the bot is ready
   */
  onReady() {
    this.logger.debug(`${this.client.user.username} ready!`);
    this.logger.debug(`Bot: ${this.client.user.username}#${this.client.user.discriminator}`);
    this.client.user.setStatus('online', `${this.prefix}help for help`);
    this.readyToExecute = true;
  }

  /**
   * Handle message
   * @param {Message} message to handle
   */
  onMessage(message) {
    if (this.readyToExecute && message.author.id !== this.client.user.id) {
      this.commandHandler.handleCommand(message);
    }
  }

  /**
   * Handle guild creation
   * @param {Guild} guild handle guild creation
   */
  onGuildCreate(guild) {
    if (!guild.available) {
      return;
    }
    this.logger.info(`Joined guild ${guild}`);
    guild.defaultChannel.sendMessage(`**${this.client.user.username.toUpperCase()} ready! Type ` +
                                     `\`${this.prefix}help\` for help**`);
  }
}

module.exports = Genesis;
