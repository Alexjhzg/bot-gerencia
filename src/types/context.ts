import { Context } from 'grammy';

/**
 * Custom Context for the bot.
 * Extend this interface when adding middlewares like sessions, internationalization (i18n), or conversation state.
 */
export interface BotContext extends Context {
  // Add custom context fields here if needed in the future
}
