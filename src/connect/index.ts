import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { LoginResolver } from '../userbot/login/LoginResolver';
import { sessionStore } from '../userbot/login/sessionStore';
import { runUserBotForUser } from '../userbot/runUserBot';
import { BotUser } from '../mongodb/bot.user.schema';
import { env } from '../config/env';
import { createLogger } from '../utils/logger';
import { send2FANotification, sendLoginSuccessNotification } from '../bot/notifications';

const logger = createLogger('Connector');

const loginResolvers: Map<number, LoginResolver> = new Map();

export const startLoginProcess = async (
  userId: number,
  phoneNumber?: string
): Promise<LoginResolver> => {
  if (loginResolvers.has(userId)) {
    return loginResolvers.get(userId)!;
  }

  const resolver = new LoginResolver(userId, phoneNumber);
  loginResolvers.set(userId, resolver);

  const client = new TelegramClient(
    new StringSession(''),
    parseInt(env.API_ID),
    env.API_HASH,
    {
      connectionRetries: 5,
    }
  );

  logger.info({ userId }, 'Login process started');

  client
    .start({
      phoneNumber: resolver.phoneNumberCallback,
      phoneCode: async (isCodeViaApp?: boolean) => {
        return await resolver.phoneCodeCallback({ isCodeViaApp });
      },
      password: async (hint?: string) => {
        await BotUser.findOneAndUpdate(
          { userId },
          { action: 'awaiting_2fa' }
        );
        logger.info({ userId, hint }, '2FA required');
        await send2FANotification(userId, hint);
        return await resolver.passwordCallback(hint);
      },
      onError: (err) => logger.error({ err, userId }, 'Login error'),
    })
    .then(async () => {
      const sessionString = client.session.save() as unknown as string;
      await sessionStore.set(userId, sessionString);

      const user = await BotUser.findOne({ userId });
      const isShareActivation = user?.pendingShareActivation === true;

      const updateData: any = {
        action: 'done',
        pendingShareActivation: false,
      };

      if (isShareActivation) {
        updateData.status = 'active';
        updateData.pay = 'share';
        updateData.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        logger.info({ userId }, 'Share activation completed - user is now active');
      }

      await BotUser.findOneAndUpdate({ userId }, updateData);

      logger.info({ userId }, 'Login successful');

      loginResolvers.delete(userId);
      resolver.cleanup();

      await sendLoginSuccessNotification(userId);
      await runUserBotForUser(userId, sessionString);
    })
    .catch((error) => {
      logger.error({ error, userId }, 'Login failed');
      loginResolvers.delete(userId);
      resolver.cleanup();
    });

  return resolver;
};

export const getLoginResolver = (userId: number, phoneNumber?: string): LoginResolver | null => {
  if (loginResolvers.has(userId)) {
    return loginResolvers.get(userId)!;
  }

  startLoginProcess(userId, phoneNumber);
  return loginResolvers.get(userId) || null;
};

export const handleCodeInput = (userId: number, digit: string): void => {
  const resolver = loginResolvers.get(userId);
  if (resolver) {
    resolver.addCodeDigit(digit);
  }
};

export const handlePasswordInput = (userId: number, password: string): void => {
  const resolver = loginResolvers.get(userId);
  if (resolver) {
    resolver.resolvePassword(password);
  }
};

export const getCurrentCode = (userId: number): string => {
  const resolver = loginResolvers.get(userId);
  return resolver ? resolver.getCurrentCode() : '';
};
