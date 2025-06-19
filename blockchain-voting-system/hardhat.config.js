require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    volta: {
      url: process.env.VOLTA_RPC,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
