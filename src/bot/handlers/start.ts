import { Context } from 'telegraf';
import { BotUser } from '../../mongodb/bot.user.schema';
import { createLogger } from '../../utils/logger';
import { startKeyboard } from '../keyboards';
import { t } from '../i18n';

const logger = createLogger('StartHandler');

export const handleStart = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    let user = await BotUser.findOne({ userId });
    
    if (!user) {
      user = await BotUser.create({
        userId,
        status: 'disabled',
        action: 'guest',
        pay: 'share',
        settings: {
          language: 'uz',
        },
      });
      logger.info({ userId }, 'New user created');
    }

    const lang = user.settings.language || 'uz';
    
    await ctx.reply(t(lang, 'welcome'), startKeyboard(lang));
    
    logger.info({ userId }, 'Start command handled');
  } catch (error) {
    logger.error({ error, userId }, 'Error in start handler');
    await ctx.reply('An error occurred. Please try again.');
  }
};
