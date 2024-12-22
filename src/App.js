import React, { useState, useEffect } from 'react';
import { Web3Provider, JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { parseEther, formatEther } from '@ethersproject/units';
import KingOfTheHillABI from './KingOfTheHill.json';
import NicknamesABI from './Nicknames.json';
import './App.css';

// Contract addresses for Avalanche Testnet
const KING_CONTRACT_ADDRESS = '0x319a10672d98B7E0522e50C613f50d4d596B3Dc9';
const NICKNAMES_CONTRACT_ADDRESS = '0x1d83f0c15d62515116E335ADcFF1A96C41871451';

// Avalanche Testnet config
const AVALANCHE_CHAIN_ID = '0xa869'; // 43113 in hex
const AVALANCHE_PARAMS = {
  chainId: AVALANCHE_CHAIN_ID,
  chainName: 'Avalanche Testnet C-Chain',
  nativeCurrency: {
    name: 'AVAX',
    symbol: 'AVAX',
    decimals: 18
  },
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://testnet.snowtrace.io']
};

// RPC URL
const RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";

function App() {
  // State hooks setup
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [currentKing, setCurrentKing] = useState('');
  const [currentPrize, setCurrentPrize] = useState('');
  const [timeOnThrone, setTimeOnThrone] = useState('');
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [initialTime, setInitialTime] = useState(null);
  const [localTime, setLocalTime] = useState(0);
  const [currentBid, setCurrentBid] = useState('0');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [topKings, setTopKings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showMessages, setShowMessages] = useState(false);
  const [isLoadingTopKings, setIsLoadingTopKings] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [nickname, setNickname] = useState('');
  const [userNickname, setUserNickname] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [timeUntilDistribution, setTimeUntilDistribution] = useState(null);
  const [prizePool, setPrizePool] = useState('0');

  // Hook up wallet connection
  const connectWallet = async () => {
    try {
      // First, check and switch network
      const networkOk = await checkAndSwitchNetwork();
      if (!networkOk) return;

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setIsConnected(true);
      
      // Setup wallet event listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      fetchKingInfo();
    } catch (error) {
      console.error('Error connecting:', error);
      setMessage('CONNECTION ERROR');
    }
  };

  // Handle wallet account changes
  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setIsConnected(false);
      setAccount('');
    } else {
      setAccount(accounts[0]);
      setIsConnected(true);
    }
  };

  // Init check for wallet connection
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);
            fetchKingInfo();
          }
        } catch (error) {
          console.error('Connection check failed:', error);
        }
      }
    };
    checkConnection();
  }, []);

  // Helper to request account access
  const requestAccount = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not found!');
    }
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    return accounts[0];
  };

  // Main game interaction - claim the throne
  const claimThrone = async () => {
    if (!amount) {
      setMessage('ENTER AMOUNT');
      return;
    }

    try {
      await requestAccount();
      const provider = new Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, signer);

      const tx = await kingContract.claimThrone({ 
        value: parseEther(amount)
      });
      
      setMessage('WAITING FOR CONFIRMATION...');
      await tx.wait();
      setMessage('THRONE CLAIMED!');
      
      fetchKingInfo();
      fetchGameInfo();
    } catch (error) {
      console.error('Error:', error);
      if (error.message.includes('Need more AVAX')) {
        setMessage('BID MUST BE HIGHER');
      } else if (error.message.includes('insufficient funds')) {
        setMessage('INSUFFICIENT AVAX');
      } else if (error.message.includes('user rejected')) {
        setMessage('TRANSACTION CANCELLED');
      } else if (error.message.includes('Must have a nickname')) {
        setMessage('NICKNAME REQUIRED');
        setShowNicknameModal(true);
      } else {
        setMessage('TRANSACTION FAILED');
      }
    }
  };

  // Fetch current game state
  const fetchKingInfo = async () => {
    try {
      const provider = new Web3Provider(window.ethereum);
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, provider);
      
      const [nickname, bid, time] = await kingContract.getKingInfo();
      setCurrentKing(nickname);
      setCurrentBid(formatEther(bid));
      setInitialTime(Number(time));
      setLocalTime(Number(time));
    } catch (error) {
      console.error('Failed to fetch king info:', error);
    }
  };

  // Local time counter
  useEffect(() => {
    if (initialTime !== null) {
      const interval = setInterval(() => {
        setLocalTime(prevTime => prevTime + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [initialTime]);

  // Fetch game info
  const fetchGameInfo = async () => {
    try {
      const provider = window.ethereum 
        ? new Web3Provider(window.ethereum)
        : new JsonRpcProvider(RPC_URL);
      
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, provider);
      
      // Получаем всю информацию одним вызовом
      const [king, kingNickname, currentBid, timeLeft, prizePool] = await kingContract.getFullGameInfo();
      
      console.log('Game info:', {
        king,
        kingNickname,
        currentBid: formatEther(currentBid),
        timeLeft: Number(timeLeft),
        prizePool: formatEther(prizePool)
      });
      
      setCurrentKing(kingNickname || king);
      setCurrentBid(formatEther(currentBid));
      setTimeUntilDistribution(Number(timeLeft));
      setPrizePool(formatEther(prizePool));
      
    } catch (error) {
      console.error('Failed to fetch game info:', error);
    }
  };

  // Keep the existing periodic refresh for when wallet is connected
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(fetchKingInfo, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  // MetaMask existence check
  useEffect(() => {
    const checkMetaMask = async () => {
      if (!window.ethereum) {
        setMessage('Please install MetaMask!');
        return;
      }
    };
    checkMetaMask();
  }, []);

  // Wallet disconnect handler
  const disconnectWallet = () => {
    setIsConnected(false);
    setAccount('');
    setMessage('');
    setIsDropdownOpen(false);
  };

  // Fetch top kings
  const fetchTopKings = async () => {
    try {
      setIsLoadingTopKings(true);
      console.log('Fetching top kings...');
      
      const provider = window.ethereum 
        ? new Web3Provider(window.ethereum)
        : new JsonRpcProvider(RPC_URL);
      
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, provider);
      
      // Use getTopKings instead of event listeners
      const topKingsData = await kingContract.getTopKings();
      console.log('Raw top kings data:', topKingsData);
      
      // Get nicknames for all addresses
      const kingsWithNicknames = await Promise.all(
        topKingsData.map(async (king) => {
          const nickname = await getNickname(king.addr);
          return {
            address: king.addr,
            nickname: nickname || king.addr,
            timeOnThrone: Number(king.timeOnThrone)
          };
        })
      );
      
      // Sort by time on throne (though they should already be sorted)
      const formattedKings = kingsWithNicknames
        .filter(king => king.address !== "0x0000000000000000000000000000000000000000")
        .sort((a, b) => b.timeOnThrone - a.timeOnThrone);
      
      console.log('Formatted kings:', formattedKings);
      setTopKings(formattedKings);
      
    } catch (error) {
      console.error('Failed to fetch top kings:', error);
    } finally {
      setIsLoadingTopKings(false);
    }
  };

  // Fetch messages from the chain
  const fetchMessages = async () => {
    try {
      setIsLoadingMessages(true);
      
      // Init provider based on wallet availability
      const provider = window.ethereum 
        ? new Web3Provider(window.ethereum)
        : new JsonRpcProvider(RPC_URL);
      
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, provider);
      
      // Grab all msgs directly from the contract
      const allMessages = await kingContract.getAllMessages();
      console.log('Raw messages from contract:', allMessages);
      
      // Process the msg data
      const fetchedMessages = await Promise.all(
        allMessages.map(async (msg) => {
          const nickname = await getNickname(msg.sender);
          return {
            id: Math.random().toString(), // tmp id for React key prop
            sender: nickname || msg.sender,
            content: msg.content
          };
        })
      );
      
      // Flip array to show newest msgs first
      const sortedMessages = [...fetchedMessages].reverse();
      console.log('Processed messages:', sortedMessages);
      
      setMessages(sortedMessages);
      
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Auto-refresh messages
  useEffect(() => {
    if (showMessages) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 10000); // Refresh every 10 secs
      return () => clearInterval(interval);
    }
  }, [showMessages]);

  // Send msg to the chain
  const sendMessage = async () => {
    if (!newMessage.trim()) {
      setMessage('ENTER MESSAGE');
      return;
    }

    try {
      const provider = new Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, signer);
      
      setMessage('SENDING MESSAGE...');
      const tx = await kingContract.sendMessage(newMessage);
      await tx.wait();
      
      setNewMessage('');
      setMessage('MESSAGE SENT');
      
      // Refresh messages list immediately after sending
      await fetchMessages();
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessage('FAILED TO SEND MESSAGE');
    }
  };

  // Check and switch network if needed
  const checkAndSwitchNetwork = async () => {
    try {
      if (!window.ethereum) {
        setMessage('METAMASK NOT FOUND');
        return false;
      }

      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (chainId !== AVALANCHE_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [AVALANCHE_PARAMS],
          });
          return true;
        } catch (error) {
          console.error('Error adding Avalanche network:', error);
          setMessage('FAILED TO ADD AVALANCHE');
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking network:', error);
      setMessage('NETWORK CHECK FAILED');
      return false;
    }
  };

  // Handle chain switching
  const handleChainChanged = async (chainId) => {
    if (chainId !== AVALANCHE_CHAIN_ID) {
      setMessage('PLEASE SWITCH TO AVALANCHE');
      setIsConnected(false);
      window.location.reload();
    }
  };

  // Grab nickname for an address
  const getNickname = async (address) => {
    try {
      const provider = window.ethereum 
        ? new Web3Provider(window.ethereum)
        : new JsonRpcProvider(RPC_URL);
      
      const nicknamesContract = new Contract(
        NICKNAMES_CONTRACT_ADDRESS,
        NicknamesABI,
        provider
      );
      
      const nickname = await nicknamesContract.getNickname(address);
      // Return full nickname or address
      return nickname || address;
    } catch (error) {
      console.error('Error fetching nickname:', error);
      return address;
    }
  };

  // Set user's nickname
  const setUserNicknameHandler = async () => {
    if (!nickname.trim()) {
      setMessage('ENTER NICKNAME');
      return;
    }

    try {
      const provider = new Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const nicknamesContract = new Contract(
        NICKNAMES_CONTRACT_ADDRESS,
        NicknamesABI,
        signer
      );
      
      setMessage('SETTING NICKNAME...');
      const tx = await nicknamesContract.setNickname(nickname);
      await tx.wait();
      
      setUserNickname(nickname);
      setShowNicknameModal(false);
      setMessage('NICKNAME SET');
    } catch (error) {
      console.error('Error setting nickname:', error);
      setMessage('FAILED TO SET NICKNAME');
    }
  };

  // Check nickname when wallet connects
  useEffect(() => {
    const checkNickname = async () => {
      if (isConnected && account) {
        const nick = await getNickname(account);
        setUserNickname(nick);
      }
    };
    checkNickname();
  }, [isConnected, account]);

  // Update king's display name with nickname
  useEffect(() => {
    const updateKingNickname = async () => {
      if (currentKing && currentKing !== "0x0000000000000000000000000000000000000000") {
        const kingNick = await getNickname(currentKing);
        setCurrentKing(kingNick);
      }
    };
    updateKingNickname();
  }, [currentKing]);

  // Format time left
  const formatTimeLeft = (seconds) => {
    if (!seconds) return 'WAITING...';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    // Возвращаем строку только с днями, часами и минутами
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Calculate prizes
  const calculatePrizes = (total) => {
    const totalAmount = parseFloat(total);
    return {
      first: (totalAmount * 0.5).toFixed(4),
      second: (totalAmount * 0.3).toFixed(4),
      third: (totalAmount * 0.15).toFixed(4)
    };
  };

  // Добавьте useEffect для начальной загрузки
  useEffect(() => {
    const initialLoad = async () => {
      setIsLoading(true);
      try {
        const provider = new JsonRpcProvider(RPC_URL);
        const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, provider);
        
        // Получаем всю информацию одним вызовом
        const [king, kingNickname, currentBid, timeLeft, prizePool] = await kingContract.getFullGameInfo();
        
        setCurrentKing(kingNickname || king);
        setCurrentBid(formatEther(currentBid));
        setTimeUntilDistribution(Number(timeLeft));
        setPrizePool(formatEther(prizePool));
        
      } catch (error) {
        console.error('Initial load failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialLoad();
  }, []); // Запускаем только при монтировании

  // Добавьте useEffect для периодического обновления
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const provider = new JsonRpcProvider(RPC_URL);
        const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, provider);
        
        const [king, kingNickname, currentBid, timeLeft, prizePool] = await kingContract.getFullGameInfo();
        
        setCurrentKing(kingNickname || king);
        setCurrentBid(formatEther(currentBid));
        setTimeUntilDistribution(Number(timeLeft));
        setPrizePool(formatEther(prizePool));
        
      } catch (error) {
        console.error('Update failed:', error);
      }
    }, 1000); // Обновляем каждую секунду

    return () => clearInterval(interval);
  }, []); // Пустой массив зависимостей

  // UI render
  return (
    <div className="app-container">
      <div className="header">
        <div className="top-section">
          <div className="king-address">
            {isLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <h2>SYNCHRONIZING WITH BLOCKCHAIN...</h2>
              </div>
            ) : currentKing && currentKing !== "0x0000000000000000000000000000000000000000" ? (
              <>
                <div className="king-title">
                  <h2>KING:</h2>
                  <p>{currentKing}</p>
                </div>
                <h3 className="current-bid">CURRENT BID: {currentBid} AVAX</h3>
                <h3 className="prize-info">PRIZE POOL: {prizePool} AVAX</h3>
              </>
            ) : (
              <h2>THRONE AWAITS ITS FIRST RULER</h2>
            )}
          </div>

          <div className="round-timer">
            <h2>ROUND ENDS IN:</h2>
            <p>{formatTimeLeft(timeUntilDistribution)}</p>
          </div>

          {!isConnected ? (
            <button className="connect-button" onClick={connectWallet}>
              {'>'} CONNECT WALLET
            </button>
          ) : (
            <div className="account-info">
              <div className="account-dropdown">
                <div 
                  className="account-address" 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  {/* Always show shortened address */}
                  {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''}
                  <span className="dropdown-arrow">▼</span>
                </div>
                {isDropdownOpen && (
                  <div className="dropdown-menu">
                    <button onClick={() => setShowNicknameModal(true)}>
                      {'>'} SET NICKNAME
                    </button>
                    <button onClick={disconnectWallet}>
                      {'>'} DISCONNECT
                    </button>
                  </div>
                )}
              </div>
              <div className="connection-status">
                <span className="status-dot"></span>
                CONNECTED
              </div>
            </div>
          )}
        </div>

        <div className="king-animation">
          <img src="/king.gif" alt="ASCII King" className="king-gif" />
        </div>

        <div className="leaderboard-container">
          <div className="button-group">
            <button 
              className="leaderboard-toggle" 
              onClick={() => {
                setShowLeaderboard(!showLeaderboard);
                if (!showLeaderboard) {
                  fetchTopKings();
                }
              }}
            >
              {'>'} {showLeaderboard ? 'HIDE' : 'SHOW'} TOP KINGS
            </button>
            <button 
              className="rules-button"
              onClick={() => setShowRulesModal(true)}
            >
              {'>'} RULES
            </button>
          </div>
          
          {showLeaderboard && (
            <div className="leaderboard">
              <h3>{'>'} HALL OF FAME</h3>
              {isLoadingTopKings ? (
                <div className="loading-message">{'>'} LOADING TOP KINGS...</div>
              ) : topKings && topKings.length > 0 ? (
                <div className="leaderboard-list">
                  {topKings.map((king, index) => (
                    <div key={index} className="leaderboard-item">
                      <span className="rank">#{index + 1}</span>
                      <div className="king-info">
                        <span className="address">
                          {king.nickname}
                        </span>
                        <span className="time">
                          {(king.timeOnThrone || 0)}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data-message">{'>'} NO KINGS YET</div>
              )}
            </div>
          )}
        </div>
      </div>

      {isConnected ? (
        <div className="game-container">
          <div className="king-info">
            <div className="info-card">
              <h3>{'>'} TIME ON THRONE</h3>
              <p>{localTime ? `${localTime} sec.` : '0 sec.'}</p>
            </div>
          </div>

          <div className="game-info">
            <div className="info-card">
              <h3>{'>'} NEXT DISTRIBUTION IN</h3>
              <p>{formatTimeLeft(timeUntilDistribution)}</p>
            </div>
            
            <div className="info-card prize-pool">
              <h3>{'>'} PRIZE POOL: {prizePool} AVAX</h3>
              {prizePool !== '0' && (
                <div className="prize-distribution">
                  <p>1st PLACE: {calculatePrizes(prizePool).first} AVAX</p>
                  <p>2nd PLACE: {calculatePrizes(prizePool).second} AVAX</p>
                  <p>3rd PLACE: {calculatePrizes(prizePool).third} AVAX</p>
                </div>
              )}
            </div>
          </div>

          <div className="action-container">
            <input
              type="text"
              placeholder="> ENTER AMOUNT IN AVAX"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="amount-input"
            />
            <div className="button-group">
              <button className="action-button claim-button" onClick={claimThrone}>
              {'>'} BECOME KING
              </button>
            </div>
          </div>

          {message && (
            <div className="message">
              {'>'} {message}
              <button 
                className="message-close" 
                onClick={() => setMessage('')}
              >
                ×
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="connect-prompt">
          <p>{'>'} CONNECT WALLET TO START THE GAME</p>
        </div>
      )}

      <div className="messages-container">
        <button 
          className="messages-toggle" 
          onClick={() => {
            setShowMessages(!showMessages);
            if (!showMessages) fetchMessages();
          }}
        >
          {'>'} {showMessages ? 'HIDE' : 'SHOW'} MESSAGES
        </button>
        
        {showMessages && (
          <div className="messages-board">
            <h3>{'>'} MESSAGES</h3>
            {isConnected && (
              <div className="message-input-container">
                <input
                  type="text"
                  placeholder="> ENTER MESSAGE"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="message-input"
                />
                <button 
                  onClick={sendMessage} 
                  className="send-message-button"
                  disabled={isLoadingMessages}
                >
                  {'>'} SEND
                </button>
              </div>
            )}
            {isLoadingMessages ? (
              <div className="loading-message">{'>'} LOADING MESSAGES...</div>
            ) : messages.length > 0 ? (
              <div className="messages-list">
                {messages.map((msg) => (
                  <div key={msg.id} className="message-item">
                    <span className="message-sender">
                      {msg.sender}
                    </span>
                    <span className="message-content">{msg.content}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data-message">{'>'} NO MESSAGES YET</div>
            )}
          </div>
        )}
      </div>

      {isConnected && window.ethereum && window.ethereum.chainId !== AVALANCHE_CHAIN_ID && (
        <div className="network-warning">
          <p>{'>'} WRONG NETWORK DETECTED</p>
          <button 
            className="network-switch-button"
            onClick={checkAndSwitchNetwork}
          >
            {'>'} SWITCH TO AVALANCHE TESTNET
          </button>
        </div>
      )}

      {showNicknameModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{'>'} SET NICKNAME</h3>
            <p className="nickname-explanation">
              {'>'} NICKNAME REQUIRED TO PLAY
            </p>
            <input
              type="text"
              placeholder="> ENTER NICKNAME"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="nickname-input"
            />
            <div className="modal-buttons">
              <button onClick={setUserNicknameHandler}>{'>'} CONFIRM</button>
              <button onClick={() => {
                setShowNicknameModal(false);
                setMessage('');
              }}>{'>'} CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {showRulesModal && (
        <div className="modal-overlay">
          <div className="modal-content rules-modal">
            <h3>{'>'} KING OF THE HILL RULES</h3>
            
            <div className="rules-content">
              <p>{'>'} OBJECTIVE:</p>
              <ul>
                <li>Become the King by placing a higher bid than current</li>
                <li>Hold the throne as long as possible</li>
              </ul>

              <p>{'>'} MECHANICS:</p>
              <ul>
                <li>Each new bid must be higher than the current one</li>
                <li>Your throne time accumulates while you are King</li>
                <li>The player with the most accumulated throne time wins</li>
                <li>Prize pool distribution happens every 7 days</li>
              </ul>

              <p>{'>'} REWARDS:</p>
              <ul>
                <li>1st place (longest total throne time): 50% of prize pool</li>
                <li>2nd place: 30% of prize pool</li>
                <li>3rd place: 15% of prize pool</li>
                <li>5% goes to project maintenance</li>
              </ul>

              <p>{'>'} REQUIREMENTS:</p>
              <ul>
                <li>Set your nickname before participating</li>
                <li>Make sure you have enough AVAX for your bid</li>
              </ul>
            </div>

            <div className="modal-buttons">
              <button onClick={() => setShowRulesModal(false)}>{'>'} CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;