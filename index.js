import {
  getEmpireMetadata,
  sendTelegramNotify,
  getItemPriceOnWaxpeer,
  createWithdrawal,
  placeBid,
} from "./fetch.js";
import dataToParce from "./dataToParce.json" assert { type: "json" };
import io from "socket.io-client";
import pkg from "https-proxy-agent";
import dotenv from "dotenv";

dotenv.config();

const getEmpireMetadataWithRetry = async () => {
  try {
    const metaData = await getEmpireMetadata();
    return metaData;
  } catch (error) {
    console.log("Error fetching meta_data, retrying...");

    await new Promise((resolve) =>
      setTimeout(() => {
        console.log("Waiting 10 seconds to next request...");
        resolve();
      }, 10000)
    );
    return getEmpireMetadataWithRetry();
  }
};

const initSocket = async () => {
  let metaData = await getEmpireMetadataWithRetry();

  const domain = "csgoempiretr.com";
  const socketEndpoint = `wss://trade.${domain}/trade`;

  const PROXY_ADDRESS = process.env.PROXY_ADDRESS || "";
  const PROXY_PORT = process.env.PROXY_PORT || "";

  let agent = null;
  if (PROXY_ADDRESS && PROXY_PORT) {
    const { HttpProxyAgent } = pkg;
    agent = new HttpProxyAgent({
      host: PROXY_ADDRESS,
      port: parseInt(PROXY_PORT),
      secure: true,
    });
  }

  const socketOptions = {
    transports: ["websocket"],
    path: "/s/",
    secure: true,
    rejectUnauthorized: false,
    reconnect: true,
    extraHeaders: { "User-agent": `${metaData.user.id} API Bot` },
    agent: agent || undefined,
  };

  const socket = io(socketEndpoint, socketOptions);

  socket.on("connect", () => {
    console.log("Connected to websocket");

    socket.on("init", async (data) => {
      if (data && data.authenticated) {
        console.log(`Successfully authenticated as ${data.name}`);

        socket.emit("filters", {
          price_max: 9999999,
        });
      } else {
        console.log(`Not Auntificated, trying to get meta_data`);
        metaData = await getEmpireMetadataWithRetry();

        socket.emit("identify", {
          uid: metaData.user.id,
          model: metaData.user,
          authorizationToken: metaData.socket_token,
          signature: metaData.socket_signature,
        });
      }
    });

    socket.on("new_item", (data) => {
      data.map((item) => {
        checkIfTheItemFits(item);
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      socket.removeAllListeners("new_item");
      socket.removeAllListeners("init");
    });
  });

  socket.on("close", (reason) => console.log(`Socket closed: ${reason}`));
  socket.on("error", (data) => console.log(`WS Error: ${data}`));
  socket.on("connect_error", (data) => console.log(`Connect Error: ${data}`));
};

initSocket();

const checkIfTheItemFits = async (itemData) => {
  const COIN_TO_USD_RATE = 0.6142808;

  const itemId = itemData.id;
  const priceAtCoins = itemData.market_value;
  const marketName = itemData.market_name;
  const marketValue =
    (Math.round(itemData.market_value * COIN_TO_USD_RATE) * 100) / 10000;
  let waxpeerPriceWithFees;
  const suggestPrice =
    (Math.round(itemData.suggested_price * COIN_TO_USD_RATE) * 100) / 10000;

  let publishedAt = new Date(itemData.published_at);
  const publishedAtMessage = `${publishedAt.getHours()}h:${publishedAt.getMinutes()}m:${publishedAt.getSeconds()}s`;

  const aboveRecomendedPrice = itemData.above_recommended_price;
  const type = itemData?.item_search?.type || null;
  const category = itemData?.item_search?.category || null;
  const stickers = itemData.stickers;

  // Items over 500$ parsing (only notificatins)
  // if (
  //   marketValue > 500 &&
  //   aboveRecomendedPrice < 0 &&
  //   type !== "Knife" &&
  //   category !== "Gloves"
  // ) {
  //   waxpeerPriceWithFees =
  //     Math.round(
  //       ((await getItemPriceOnWaxpeer(marketName).catch((error) =>
  //         console.log("Seemed we got rate limit on waxpeer :(", error)
  //       )) /
  //         1000) *
  //         0.96 *
  //         0.99 *
  //         100
  //     ) / 100;
  //   console.log(
  //     `<strong>EMPIRE BOT PARCED ITEM</strong>\n\nItem Name: ${marketName}\nList price: ${marketValue}$\nWaxpeer price with fees: ${waxpeerPriceWithFees}$\nSuggest price: ${suggestPrice}$\nItem was listed at: ${publishedAtMessage}\nDifferense from the recommended price: ${aboveRecomendedPrice}%`
  //   );

  //   try {
  //     await sendTelegramNotify(
  //       `<strong>EMPIRE BOT PARCED ITEM</strong>\n\nItem Name: ${marketName}\nList price: ${marketValue}$\n<a href="https://waxpeer.com/${encodeURIComponent(
  //         marketName
  //       )}">Waxpeer price with fees: ${waxpeerPriceWithFees}$</a>\nSuggest price: ${suggestPrice}$\nItem was listed at: ${publishedAtMessage} (MSK)\nDifferense from the recommended price: ${aboveRecomendedPrice}%`
  //     );
  //   } catch (error) {
  //     console.log("Telegram send notify error: ", error);
  //   }
  // }

  // Items with required stickers parsing (withdraw or first bid and notification)
  console.log(isContainNecessarySticker(stickers));
  if (
    aboveRecomendedPrice <= 6 &&
    isContainNecessarySticker(stickers) &&
    marketValue < 50
  ) {
    let stickersNameArray = [];
    stickers.map((sticker) => {
      stickersNameArray.push(sticker.name);
    });
    console.log(stickersNameArray);
    console.log(
      `<strong>STIKERED ITEM PARCED</strong>\n\n<a href="https://csgoempiretr.com/item/${encodeURIComponent(
        itemId
      )}">Item Name: ${marketName}</a>\nList price: ${marketValue}$\n<a href="https://waxpeer.com/${encodeURIComponent(
        marketName
      )}">Waxpeer price with fees: ${waxpeerPriceWithFees}$</a>\nSuggest price: ${suggestPrice}$\nItem was listed at: ${publishedAtMessage} (MSK)\nDifferense from the recommended price: ${aboveRecomendedPrice}%\nStickers: ${stickersNameArray.join(
        ", "
      )}`
    );

    if (aboveRecomendedPrice > 0) {
      await createWithdrawal(itemId, priceAtCoins).catch((error) =>
        console.log("Error wthdrawing item: ", error)
      );
    } else {
      await placeBid(itemId, priceAtCoins).catch((error) =>
        console.log("Error placing bid: ", error)
      );
    }

    waxpeerPriceWithFees =
      Math.round(
        ((await getItemPriceOnWaxpeer(marketName).catch((error) =>
          console.log("Seemed we got rate limit on waxpeer :(", error)
        )) /
          1000) *
          0.96 *
          0.99 *
          100
      ) / 100;

    await sendTelegramNotify(
      `<strong>STIKERED ITEM PARCED</strong>\n\n<a href="https://csgoempiretr.com/item/${encodeURIComponent(
        itemId
      )}">Item Name: ${marketName}</a>\nList price: ${marketValue}$\n<a href="https://waxpeer.com/${encodeURIComponent(
        marketName
      )}">Waxpeer price with fees: ${waxpeerPriceWithFees}$</a>\nSuggest price: ${suggestPrice}$\nItem was listed at: ${publishedAtMessage} (MSK)\nDifferense from the recommended price: ${aboveRecomendedPrice}%\nStickers: ${stickersNameArray.join(
        ", "
      )}`
    ).catch((error) => console.log("Telegram send notify error: ", error));
  }
};

const isContainNecessarySticker = (stickers) => {
  const necessaryStickers = dataToParce.necessaryStickers;

  return stickers.some((sticker) => necessaryStickers.includes(sticker.name));
};
