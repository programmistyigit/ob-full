# OblivionLog - Telegram Message Archiving System

## Overview

OblivionLog is a Telegram message archiving system that automatically backs up private messages to dedicated channels. The application consists of a Telegraf bot for user interaction and GramJS userbots for message monitoring and archiving. Users authenticate via Telegram sessions (StringSession), subscribe using Telegram Stars payment, and customize their archive preferences through a multi-language interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Components

**Bot Layer (Telegraf)**
- User interaction interface using Telegraf framework
- Multi-language support (Uzbek, English, Russian) with translation system
- Callback-based UI for code input, settings management, and payment flows
- Session-based state management tracking user authentication progress (guest → awaiting_code → awaiting_2fa → done)

**Userbot Layer (GramJS)**
- Telegram client automation using GramJS/telegram library
- StringSession-based authentication for maintaining user sessions
- Event-driven message monitoring for private conversations
- Automatic message archiving to private channels
- Media handling with ephemeral content preservation (download → re-upload pattern)

**Bridge Architecture (Connect Module)**
- Orchestrates communication between bot and userbot layers
- Login flow management with async resolvers for phone/code/password inputs
- Session lifecycle management (creation, activation, monitoring, termination)

**Data Layer (MongoDB + Mongoose)**
- User profiles with subscription status, settings, and authentication state
- Archive records tracking message metadata and forwarding status
- User-channel relationships for archive destination management
- Session persistence in JSON file storage

### Authentication Flow

1. User initiates connection via bot command
2. Phone number collection (via contact sharing or manual input)
3. SMS code input using numeric keyboard callbacks
4. Optional 2FA password handling for secured accounts
5. StringSession generation and persistence
6. Userbot client initialization with stored session

### Message Archiving Strategy

**Archive Processing Flow:**
1. Message event listener monitors all incoming/outgoing messages
2. Filters: Only private chats with real users (excludes bots, channels, groups)
3. Settings check: Only processes if user's savedMessage.enabled=true
4. Granular control: Checks savedMessage.message for text, savedMessage.media for files
5. Creates dedicated private channel for each contact (named after contact)
6. Forwards message to channel (or sends with metadata if forward fails)
7. Handles media: forward or download+upload with metadata
8. Direction tracking: "me→other" or "other->me"

**Granular Archive Control (savedMessage):**
- Structure: `{ enabled: boolean, message: boolean, media: boolean }`
- enabled: Master toggle for archiving
- message: Archive text messages (when enabled=true)
- media: Archive media files (when enabled=true)
- Backward compatibility: Legacy boolean values auto-migrate on first toggle
- Migration: Settings handler converts boolean to object atomically using $set

**Settings UI Flow:**
- Main settings: Shows "Saved Messages: on/off" toggle
- Click when OFF: Enables archiving with all options (message+media) turned on
- Click when ON: Opens submenu with granular controls
- Submenu options:
  - Toggle text messages on/off
  - Toggle media files on/off
  - Disable Archive button (turns off archiving completely)
  - Back button (return to main settings)
- All UI updates use message editing (no duplicate messages or stale keyboards)

**Dual-mode archiving:**
- **Channel mode**: Forward messages to dedicated private channels per contact
- **Saved Messages mode**: Copy to user's Saved Messages
- **Both mode**: Redundant archiving to both destinations

**Media handling:**
- Attempt direct forward first
- If fails: Download to temporary local storage
- Re-upload to archive destination with metadata
- Cleanup temporary files after successful transfer

**Database Storage (Target ID Whitelist):**
- Archive collection stores ONLY messages from/to target users
- Target IDs configured via TARGET_IDS environment variable (comma-separated)
- Non-target conversations: archived to Telegram channels but NOT saved to database
- Privacy: No server/DB storage for regular users, only whitelisted targets
- Metadata: Message direction, forwarding status, media info, timestamps

**Metadata Format:**
- Direction: "me→other" or "other→me"
- Contact info: Name, username, user ID
- Timestamp and message ID
- Media filename and type (if applicable)

### Payment System

**Telegram Stars Integration:**
- 30-day subscription model (100 Stars default)
- Invoice generation via Telegram Bot API
- Pre-checkout query validation
- Successful payment webhook handling
- Expiration tracking with automatic status updates
- Atomic aggregation pipeline prevents race conditions in concurrent payments
- Multiple payments stack: each adds 30 days to existing expiry

**Share-Based Activation:**
- Alternative free activation method
- User agrees to post ad in Stories for 1 day and share with mutual contacts
- Activation flow: Terms → Contact request → Login → Activation on success
- Uses pendingShareActivation flag to defer activation until login completes
- Prevents premature activation if login fails or is abandoned
- Sets pay='share' and 30-day expiry on successful login completion

### Parental Control System

**Architecture:**
- Many-to-many parent-child relationships with approval flow
- Separate monitoring subscriptions (50 stars/month per child per parent)
- Database schema tracks: approvalStatus, expiresAt per connection
- Dual-layer monitoring: channel-based (if parent connected) or bot notifications (fallback)

**Parent-Child Connection Flow:**
1. Parent searches for child (phone/username/ID) via settings menu
2. System sends approval request to child with parent info
3. Child approves/declines connection request
4. Upon approval, connection status set to 'approved' but inactive (no expiry)
5. Parent must pay 50 stars/month to activate monitoring
6. Payment extends both parent and child connection expiry (30 days)

**Monitoring Payment System:**
- Price: 50 Telegram Stars per month per child
- Invoice payload: `monitoring_{parentId}_{childId}`
- Atomic expiry updates using MongoDB aggregation pipeline
- Supports stacking: multiple payments extend expiry further
- Child detail view shows monitoring status and payment button

**Archive Monitoring Structure:**

**If parent is connected (has userbot):**
- Creates folder channel in parent's account: `📁 {ChildName}`
- Inside folder, creates contact channels for each person child talks to
- Forwards/sends child's messages to appropriate contact channel
- Message metadata includes: child name, direction, contact, timestamp

**If parent is NOT connected (fallback):**
- Sends bot notifications to parent via Telegram bot
- Notification format: child name, direction, contact, time, message/media type
- Real-time alerts for each monitored message

**Translation Support:**
- Full i18n for Uzbek, English, Russian
- Keys: pc_* prefix for parental control
- UI elements: search, approve/decline, view details, disconnect

**Settings UI:**
- Main menu: "Parental Control" button
- Parent view: Shows all monitored children, search option
- Child view: Shows all parents monitoring them
- Detail views: Connection status, expiry, payment option
- Disconnect option for both parent and child

### Session Management

**Monitoring mechanisms:**
- AUTH_KEY_UNREGISTERED detection for invalidated sessions
- Logout event tracking
- Connection state monitoring
- Automatic cleanup on session termination

**Session storage:**
- File-based persistence (sessions/session.json)
- In-memory cache for active clients
- Automatic reload on application restart

### Error Handling

**Custom error hierarchy:**
- OblivionLogError (base)
- AuthenticationError (401)
- SessionError (403)
- DatabaseError (500)
- TelegramApiError (502)

**Logging strategy:**
- Pino logger with structured logging
- Context-specific child loggers
- Environment-based formatting (pretty in dev, JSON in prod)
- Configurable log levels

## External Dependencies

### Third-Party Services

**Telegram Platform:**
- Bot API via Telegraf for bot operations
- MTProto API via GramJS for userbot functionality
- Telegram Stars payment processing
- API credentials required (API_ID, API_HASH from my.telegram.org)

**Database:**
- MongoDB for persistent storage
- Mongoose ODM for schema management
- Connection string configured via MONGO_URI environment variable

### Key Libraries

**Telegram Clients:**
- `telegraf` (^4.16.3) - Bot framework
- `telegram` (^2.26.22) - GramJS library for userbot
- `big-integer` (^1.6.52) - Large number handling for Telegram IDs

**Data & Validation:**
- `mongoose` (^8.19.1) - MongoDB ODM
- `zod` (^3.25.76) - Environment configuration validation

**Utilities:**
- `dotenv` (^16.6.1) - Environment variable management
- `pino` (^9.13.1) - Logging framework
- `pino-pretty` (^11.3.0) - Development log formatting

**Development Tools:**
- TypeScript (^5.6.2) with strict mode enabled
- ESLint + Prettier for code quality
- Vitest for testing
- ts-node for development execution

### Configuration Requirements

**Required Environment Variables:**
- `API_ID` - Telegram API ID
- `API_HASH` - Telegram API hash
- `BOT_TOKEN` - Bot authentication token
- `MONGO_URI` - MongoDB connection string (default: mongodb://localhost:27017/oblivionlog)

**Optional Configuration:**
- `ENABLE_STARS` - Toggle payment system (default: true)
- `STAR_PRICE` - Subscription cost (default: 100)
- `NODE_ENV` - Environment mode (development/production/test)
- `LOG_LEVEL` - Logging verbosity (debug/info/warn/error)
- `MEDIA_DIR` - Media storage path (default: ./archives_media)