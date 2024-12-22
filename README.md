# King of the Hill - Avalanche Game
## Game Mechanics
- Bid higher than the current king to claim the throne
 Stay king longer to earn more rewards
 Prize pool distribution every 7 days
 Real-time leaderboard tracks longest-reigning kings
 On-chain messaging system for player interaction
## Tech Stack
- **Frontend:** React.js
 **Smart Contracts:** Solidity
 **Blockchain:** Avalanche Testnet (Fuji C-Chain)
 **Web3 Integration:** ethers.js
 **Native Token:** AVAX
## Smart Contracts (Avalanche Testnet)
- **King of the Hill:** `0x319a10672d98B7E0522e50C613f50d4d596B3Dc9`
 **Nicknames:** `0x1d83f0c15d62515116E335ADcFF1A96C41871451`
## Features
- **Wallet Integration:** MetaMask support
 **Real-time Updates:** Auto-refresh game state
 **Leaderboard:** Top kings by accumulated throne time
 **Messaging System:** On-chain player communication
 **Nickname System:** Custom player names
 **Prize Distribution:** 
 - 1st place: 50% of pool
 - 2nd place: 30% of pool
 - 3rd place: 15% of pool
 - Project maintenance: 5%

## How to Play

1. Connect MetaMask wallet
2. Switch to Avalanche Testnet
3. Set nickname (required to play)
4. Place bid higher than current king using AVAX
5. Hold the throne as long as possible
6. Send messages to other players
7. Check leaderboard for your position

## Network Configuration

- **Network Name:** Avalanche Testnet C-Chain
- **RPC URL:** https://api.avax-test.network/ext/bc/C/rpc
- **Chain ID:** 43113 (0xa869 in hex)
- **Currency Symbol:** AVAX
- **Block Explorer:** https://testnet.snowtrace.io

## Security

- Smart contracts deployed on secure testnet
- Protected contract functions
- Error handling for failed transactions
- Automatic prize distribution

## License

MIT
