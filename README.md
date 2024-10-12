# CS:GO Empire & Waxpeer API Integration

This project integrates the CS:GO Empire and Waxpeer APIs to automate certain tasks like withdrawals and item price parsing. The application is designed with extensibility in mind and can be run with optional proxy configuration.

## Features

- Automated item price checking on Waxpeer
- Withdrawal creation on CS:GO Empire
- Telegram notifications for important events

## Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (version >= 14.x)
- [npm](https://www.npmjs.com/get-npm) or [yarn](https://yarnpkg.com/getting-started/install) (version >= 6.x)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo-name.git
   cd your-repo-name
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add the following variables:

   ```bash
   PROXY_ADRESS="optional"
   PROXY_PORT="optional"
   CHAT_ID="optional"
   TG_TOKEN="optional"
   EMPIRE_API="required"
   WAXPEER_API="optional"
   ```

   - `PROXY_ADRESS` and `PROXY_PORT`: Optional, used if you want to route requests through a proxy server.
   - `CHAT_ID` and `TG_TOKEN`: Optional, used for Telegram notifications.
   - `EMPIRE_API`: Required, used for interacting with the CS:GO Empire API.
   - `WAXPEER_API`: Optional, used for interacting with the Waxpeer API for price checking.

4. Start the project:

   ```bash
   npm run start
   ```

### Example .env File

```bash
PROXY_ADRESS="127.0.0.1"
PROXY_PORT="8080"
CHAT_ID="123456789"
TG_TOKEN="your-telegram-bot-token"
EMPIRE_API="your-empire-api-key"
WAXPEER_API="your-waxpeer-api-key"
```
