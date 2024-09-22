import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const getMetaDataFromPage = async (page, uuid) => {
    return await page.evaluate(async (uuid) => {
        const response = await fetch(
            `https://csgoempire.com/api/v2/metadata?uuid=${uuid}`,
            {
                method: "GET",
                headers: {
                    accept: "application/json, text/plain, */*",
                    "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                    "user-agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    priority: "u=1, i",
                    "sec-ch-ua":
                        '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"Windows"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-empire-device-identifier": `${uuid}`,
                    "x-env-class": "green",
                },
                credentials: "include",
            }
        );
        return await response.json();
    }, uuid);
};

export const sendTelegramNotify = async (message) => {
    const chatId = process.env.CHAT_ID;
    const tgToken = process.env.TG_TOKEN;

    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${tgToken}/sendMessage`,
            null,
            {
                params: {
                    chat_id: chatId,
                    parse_mode: "HTML",
                    text: message,
                },
            }
        );
    } catch (error) {
        console.error("Failed send telegram notify: ", error);
        throw error;
    }
};

export const getItemPriceOnWaxpeer = async (itemName) => {
    const waxpeerApi = process.env.WAXPEER_API;

    try {
        const response = await axios.get(
            `https://api.waxpeer.com/v1/search-items-by-name?api=${waxpeerApi}&names=${encodeURIComponent(
                itemName
            )}&game=csgo&minified=0`,
            {
                accept: "application/json",
            }
        );
        return response.data?.items[0]?.price || null;
    } catch (error) {
        console.log("Failed to get waxpeer item price: ", error);
        throw error;
    }
};
