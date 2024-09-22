import puppeteer from "puppeteer";
import dotenv from "dotenv";
import { getMetaDataFromPage, sendTelegramNotify } from "./fetch.js";

dotenv.config();

const proxyAdress = process.env.PROXY_ADRESS;
const proxyPort = process.env.PROXY_PORT;

let UUID;
let exchangeRate;
let socketToken;

(async () => {
    let args = [];

    if (proxyAdress && proxyPort) {
        args.push(`--proxy-server=${proxyAdress}:${proxyPort}`);
        console.log(`Using proxy: ${proxyAdress}:${proxyPort}`);
    } else {
        console.log("No proxy set, using default connection.");
    }

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: args,
    });
    const page = await browser.newPage();

    await page.setRequestInterception(true);

    const uuidPromise = new Promise((resolve) => {
        page.on("request", async (request) => {
            const url = request.url();

            if (url.includes("/api/v2/metadata?uuid=")) {
                console.log("Intercepted request to:", url);
                const parsedUrl = new URL(url);
                UUID = parsedUrl.searchParams.get("uuid");
                console.log(UUID);
            }

            if (url.includes("/api/v2/metadata/exchange-rates")) {
                console.log("Got exchange-rate request");

                try {
                    const response = await fetch(url, {
                        method: "GET",
                        headers: request.headers(),
                        credentials: "include",
                    });

                    const jsonResponse = await response.json();
                    exchangeRate = jsonResponse.rates;
                    console.log("Exchange Rates:", exchangeRate);
                } catch (error) {
                    console.error("Error fetching exhange rates: ", error);
                }
            }

            if (UUID && exchangeRate) {
                resolve(UUID);
            }

            request.continue();
        });
    });

    await page.goto("https://csgoempire.com/withdraw/steam/market");

    try {
        const UUID = await uuidPromise;

        const metaData = await getMetaDataFromPage(page, UUID);
        socketToken = metaData.socket_token;
        console.log("Socket Token:", socketToken);

        if (socketToken) {
            try {
                const client = await page._client();

                client.on(
                    "Network.webSocketFrameReceived",
                    ({ requestId, timestamp, response }) => {
                        const message = response.payloadData;
                        if (message.includes("new_item")) {
                            try {
                                const parsedMessage = JSON.parse(
                                    message.replace(/^42\/trade,/, "")
                                );
                                if (parsedMessage[0] === "new_item") {
                                    console.log(
                                        'Parsed "new_item" event: ',
                                        parsedMessage[1][0]
                                    );
                                    checkIfTheItemFits(parsedMessage[1][0]);
                                }
                            } catch (error) {
                                console.error(
                                    "Error parsing WebSocket message: ",
                                    error
                                );
                            }
                        }
                    }
                );

                client.on(
                    "Network.webSocketClosed",
                    ({ requestId, timestamp }) => {
                        console.log("WebSocket Closed:", requestId);
                    }
                );

                client.on("Network.webSocketCreated", ({ requestId, url }) => {
                    console.log("WebSocket Created:", url);
                });

                await client.send("Network.enable");
            } catch (error) {
                console.error("Failed listening WebSocket: ", error);
            }
        } else {
            console.log("Token wasn't retrieved");
        }
    } catch (error) {
        console.error("Error fetching metadata: ", error);
    }
})();

const checkIfTheItemFits = async (itemData) => {
    const marketName = itemData.market_name;
    const marketValue =
        (Math.round(
            (itemData.market_value / exchangeRate.CSGOEMPIRE_COIN) *
                exchangeRate.USD
        ) *
            100) /
        10000;
    const suggestPrice =
        (Math.round(
            (itemData.suggested_price / exchangeRate.CSGOEMPIRE_COIN) *
                exchangeRate.USD
        ) *
            100) /
        10000;

    let publishedAt = new Date(itemData.published_at);
    const publishedAtMessage = `${publishedAt.getHours()}h:${publishedAt.getMinutes()}m:${publishedAt.getSeconds()}s`;

    const aboveRecomendedPrice = itemData.above_recommended_price;
    const type = itemData?.item_search?.type || null;

    if (marketValue > 500 && aboveRecomendedPrice < 0) {
        console.log(
            `${marketName}\n${marketValue}\n${suggestPrice}\n${publishedAtMessage}\n${aboveRecomendedPrice}\n${type}\n`
        );
        await sendTelegramNotify(
            `<strong>EMPIRE BOT PARCED ITEM</strong>\n\nItem Name: ${marketName}\nList price: ${marketValue}$\nSuggest price: ${suggestPrice}$\nItem was listed at: ${publishedAtMessage}\nDifferense from the recommended price: ${aboveRecomendedPrice}%`
        );
    }
};
