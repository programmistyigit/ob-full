import { Context } from 'telegraf';
import { BotUser } from '../../mongodb/bot.user.schema';
import { createLogger } from '../../utils/logger';
import { contactKeyboard, numericKeyboard } from '../keyboards';
import { t } from '../i18n';
import { getLoginResolver } from '../../connect';

const logger = createLogger('ConnectHandler');

export const handleConnect = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const user = await BotUser.findOne({ userId });
    const lang = user?.settings.language || 'uz';

    if (!user || user.status !== 'active') {
      await ctx.reply('Please activate your subscription first. Use /start');
      return;
    }

    await BotUser.findOneAndUpdate(
      { userId },
      { action: 'awaiting_code' }
    );

    await ctx.reply(t(lang, 'connect_prompt'), contactKeyboard(lang));
    
    logger.info({ userId }, 'Connect initiated');
  } catch (error) {
    logger.error({ error, userId }, 'Error in connect handler');
    await ctx.reply('Error. Please try again.');
  }
};

export const handleContact = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const contact = (ctx.message as any)?.contact;
  if (!contact) return;

  try {
    const user = await BotUser.findOne({ userId });
    const lang = user?.settings.language || 'uz';

    const phoneNumber = contact.phone_number;
    logger.info({ userId, phone: phoneNumber.slice(0, 4) + '***' }, 'Contact received');

    const isShareActivation = user?.action === 'awaiting_share_contact';

    await BotUser.findOneAndUpdate(
      { userId },
      { 
        action: 'awaiting_code',
        pendingShareActivation: isShareActivation
      }
    );

    if (isShareActivation) {
      logger.info({ userId }, 'Share activation pending - will activate after successful login');
    }

    const resolver = getLoginResolver(userId, phoneNumber);
    if (resolver) {
      resolver.resolvePhoneNumber(phoneNumber);
    }

    await ctx.reply(`${t(lang, 'code_prompt')}\n\n${t(lang, 'code_label')} _____`, numericKeyboard());
    
    logger.info({ userId, isShareActivation }, 'Code input mode activated');
  } catch (error) {
    logger.error({ error, userId }, 'Error handling contact');
    await ctx.reply('Error. Please try again.');
  }
};
