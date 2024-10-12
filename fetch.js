import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const PROXY_ADDRESS = process.env.PROXY_ADDRESS || "";
const PROXY_PORT = process.env.PROXY_PORT || "";
const EMPIRE_API = process.env.EMPIRE_API;

const proxyConfig =
  PROXY_ADDRESS && PROXY_PORT
    ? {
        proxy: {
          host: PROXY_ADDRESS,
          port: PROXY_PORT,
        },
      }
    : {};

export const getEmpireMetadata = async () => {
  try {
    const response = await axios.get(
      "https://csgoempiretr.com/api/v2/metadata/socket",
      {
        headers: {
          Authorization: `Bearer ${EMPIRE_API}`,
        },
        ...proxyConfig,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error in getting metadata from empure: ", error);
    throw error;
  }
};

export const sendTelegramNotify = async (message) => {
  const CHAT_ID = process.env.CHAT_ID;
  const TG_TOKEN = process.env.TG_TOKEN;

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
      null,
      {
        params: {
          chat_id: CHAT_ID,
          parse_mode: "HTML",
          text: message,
        },
        ...proxyConfig,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Failed send telegram notify: ", error);
    throw error;
  }
};

export const getItemPriceOnWaxpeer = async (itemName) => {
  const WAXPEER_API = process.env.WAXPEER_API;

  try {
    const response = await axios.get(
      `https://api.waxpeer.com/v1/search-items-by-name?api=${WAXPEER_API}&names=${encodeURIComponent(
        itemName
      )}&game=csgo&minified=0`,
      {
        accept: "application/json",
        ...proxyConfig,
      }
    );
    return response.data?.items[0]?.price || null;
  } catch (error) {
    console.log("Failed to get waxpeer item price: ", error);
    throw error;
  }
};

export const createWithdrawal = async (depositId, coinValue) => {
  try {
    const response = await axios.post(
      `https://csgoempire.com/api/v2/trading/deposit/${depositId}/withdraw`,
      {
        coin_value: coinValue,
      },
      {
        headers: {
          Authorization: `Bearer ${EMPIRE_API}`,
          "Content-Type": "application/json",
        },
        ...proxyConfig,
      }
    );
    return response.data;
  } catch (error) {
    console.log("Failed creating withdraw: ", error);
    throw error;
  }
};

export const placeBid = async (depositId, bidValue) => {
  try {
    const response = await axios.post(
      `https://csgoempire.com/api/v2/trading/deposit/${depositId}/bid`,
      {
        bid_value: bidValue,
      },
      {
        headers: {
          Authorization: `Bearer ${EMPIRE_API}`,
          "Content-Type": "application/json",
        },
        ...proxyConfig,
      }
    );
    return response.data;
  } catch (error) {
    console.log("Error placing bid: ", error);
    throw error;
  }
};
