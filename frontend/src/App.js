import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
} from "chart.js";
import VotingABI from "./VotingABI.json";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./App.css";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  Title
);

const contractAddress = "0x676Fe29dA90b3AaFeC4302b70a808521f94B70E2";

const aboutInfo = {
  developer: {
    name: "Fanuel Bett",
    contact: "0790127907",
    copyright: "Copyright © 2025 Fanuel Bett. All rights reserved."
  },
  system: {
    name: "Blockchain Voting System",
    description: "A secure decentralized voting platform built on Ethereum that enables transparent and tamper-proof elections. The system provides real-time results, voter authentication via blockchain, and immutable vote records.",
    features: [
      "Blockchain-based voter authentication",
      "Real-time voting and results visualization",
      "Smart contract-based secure ballot casting",
      "Admin dashboard for election management",
      "Voter registration with approval workflow",
      "Transparent audit logs on the blockchain"
    ],
    technologies: [
      "React.js frontend",
      "Ethers.js for blockchain interaction",
      "Solidity smart contracts",
      "MetaMask wallet integration",
      "Chart.js for data visualization"
    ]
  }
};

const AboutSection = ({ darkMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className={`about-section card ${darkMode ? 'dark-mode' : ''}`}>
      <div className="about-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h2>About This Voting System</h2>
        <span>{isExpanded ? '▲' : '▼'}</span>
      </div>
      
      {isExpanded && (
        <div className="about-content">
          <div className="system-info">
            <h3>System Information</h3>
            <p>{aboutInfo.system.description}</p>
            
            <h4>Key Features:</h4>
            <ul>
              {aboutInfo.system.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
            
            <h4>Technologies Used:</h4>
            <ul>
              {aboutInfo.system.technologies.map((tech, index) => (
                <li key={index}>{tech}</li>
              ))}
            </ul>
          </div>
          
          <div className="developer-info">
            <h3>Developer Information</h3>
            <p><strong>Name:</strong> {aboutInfo.developer.name}</p>
            <p><strong>Contact:</strong> {aboutInfo.developer.contact}</p>
            <p><strong>{aboutInfo.developer.copyright}</strong></p>
          </div>
        </div>
      )}
    </section>
  );
};

function App() {
  const [, setProvider] = useState(null);
  const [, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [owner, setOwner] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [voterIdHash, setVoterIdHash] = useState("");
  const [isApproved, setIsApproved] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voterRegistered, setVoterRegistered] = useState(false);
  const [pendingVoters, setPendingVoters] = useState([]);
  const [votingOpen, setVotingOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const tempProvider = new ethers.BrowserProvider(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const tempSigner = await tempProvider.getSigner();
        const tempAccount = await tempSigner.getAddress();
        const tempContract = new ethers.Contract(
          contractAddress,
          VotingABI,
          tempSigner
        );

        setProvider(tempProvider);
        setSigner(tempSigner);
        setAccount(tempAccount);
        setContract(tempContract);

        const contractOwner = await tempContract.owner();
        setOwner(contractOwner);

        await loadCandidates(tempContract);
        await checkVoterStatus(tempContract, tempAccount);
        const status = await tempContract.votingOpen();
        setVotingOpen(status);

        if (tempAccount.toLowerCase() === contractOwner.toLowerCase()) {
          await loadPendingVoters(tempContract);
        }
      } else {
        alert("Please install MetaMask");
      }
    };

    init();
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  useEffect(() => {
    const total = candidates.reduce(
      (sum, candidate) => sum + Number(candidate.voteCount),
      0
    );
    setTotalVotes(total);
  }, [candidates]);

  const loadCandidates = async (contract) => {
    try {
      const candidatesArray = await contract.getAllCandidates();
      setCandidates(candidatesArray);
    } catch (error) {
      console.error("Error loading candidates:", error);
    }
  };

  const checkVoterStatus = async (contract, userAddress) => {
    try {
      const voter = await contract.voters(userAddress);
      if (voter.voterAddress !== ethers.ZeroAddress) {
        setVoterRegistered(true);
        setIsApproved(voter.isApproved);
        setHasVoted(voter.hasVoted);
      } else {
        setVoterRegistered(false);
      }
    } catch (error) {
      console.error("Error checking voter status:", error);
    }
  };

  const registerVoter = async () => {
    if (!voterIdHash.trim()) return alert("Please enter a valid ID hash");
    try {
      const tx = await contract.registerVoter(voterIdHash);
      await tx.wait();
      alert("Registration sent! Wait for admin approval.");
      setVoterRegistered(true);
      setIsApproved(false);
      setHasVoted(false);

      if (account.toLowerCase() === owner.toLowerCase()) {
        await loadPendingVoters(contract);
      }
    } catch (error) {
      alert("Registration failed");
    }
  };

  const loadPendingVoters = async (contract) => {
    try {
      const pending = await contract.getPendingVoters();
      setPendingVoters(pending);
    } catch (error) {
      console.error("Error loading pending voters:", error);
    }
  };

  const approveVoter = async (voterAddress) => {
    try {
      const tx = await contract.approveVoter(voterAddress);
      await tx.wait();
      alert(`Voter ${voterAddress} approved!`);
      await loadPendingVoters(contract);
    } catch (error) {
      alert("Approval failed");
    }
  };

  const voteForCandidate = async () => {
    if (selectedCandidate === null) return alert("Please select a candidate");
    try {
      const tx = await contract.vote(selectedCandidate);
      await tx.wait();
      alert("Vote cast!");
      setHasVoted(true);
      await loadCandidates(contract);
    } catch (error) {
      alert("Voting failed");
    }
  };

  const toggleVotingStatus = async () => {
    try {
      const newStatus = !votingOpen;
      const tx = await contract.toggleVoting(newStatus);
      await tx.wait();
      setVotingOpen(newStatus);
    } catch (error) {
      alert("Error toggling voting");
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text("Voting Results Report", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 30, { align: "center" });
    
    doc.text(`Voting Status: ${votingOpen ? "Open" : "Closed"}`, 14, 40);
    
    doc.text(`Total Votes Cast: ${totalVotes}`, 14, 50);
    
    autoTable(doc, {
      startY: 60,
      head: [['Candidate', 'Votes', 'Percentage']],
      body: candidates.map(c => [
        c.name,
        c.voteCount.toString(),
        totalVotes > 0 ? `${((Number(c.voteCount) / totalVotes) * 100).toFixed(2)}%` : '0%'
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [52, 152, 219],
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
    
    doc.save(`voting-results-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const getCandidatePercentage = (voteCount) => {
    return totalVotes > 0 ? ((Number(voteCount) / totalVotes) * 100).toFixed(2) : 0;
  };

  const chartData = {
    labels: candidates.map((c) => c.name),
    datasets: [
      {
        label: "Votes",
        data: candidates.map((c) => Number(c.voteCount)),
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40",
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const percentage = getCandidatePercentage(value);
            return `${label}: ${value} votes (${percentage}%)`;
          }
        }
      },
      legend: {
        position: 'right',
        labels: {
          color: darkMode ? '#fff' : '#333',
          font: {
            size: 14
          }
        }
      }
    }
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: darkMode ? '#fff' : '#333'
        },
        grid: {
          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        ticks: {
          color: darkMode ? '#fff' : '#333'
        },
        grid: {
          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  return (
    <div className={`app-container ${darkMode ? "dark-mode" : ""}`}>
      <header className="app-header">
        <div className="header-content">
          <h1>🗳️ Blockchain Voting System</h1>
          <div className="header-controls">
            <button onClick={toggleDarkMode} className="mode-toggle">
              {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
            <div className="account-info">
              <span className="account-address">
                {account
                  ? `${account.substring(0, 6)}...${account.substring(38)}`
                  : "Not connected"}
              </span>
              <span className={`status-badge ${votingOpen ? "open" : "closed"}`}>
                {votingOpen ? "Voting Open" : "Voting Closed"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {account === owner && (
          <section className="admin-panel card">
            <h2>Admin Controls</h2>
            <div className="admin-actions">
              <button onClick={toggleVotingStatus} className="primary-button">
                {votingOpen ? "Close Voting" : "Open Voting"}
              </button>
              
              {pendingVoters.length > 0 && (
                <div className="pending-voters">
                  <h3>Pending Voter Approvals</h3>
                  <ul>
                    {pendingVoters.map((v) => (
                      <li key={v.voterAddress}>
                        <span className="voter-address">
                          {v.voterAddress.substring(0, 10)}...
                          {v.voterAddress.substring(34)}
                        </span>
                        <button
                          onClick={() => approveVoter(v.voterAddress)}
                          className="approve-button"
                        >
                          Approve
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {!voterRegistered && (
          <section className="registration-section card">
            <h2>Voter Registration</h2>
            <div className="registration-form">
              <input
                type="text"
                placeholder="Enter your ID hash"
                value={voterIdHash}
                onChange={(e) => setVoterIdHash(e.target.value)}
                className="form-input"
              />
              <button onClick={registerVoter} className="primary-button">
                Register as Voter
              </button>
            </div>
          </section>
        )}

        {voterRegistered && !isApproved && (
          <section className="status-message card">
            <p>⏳ Your registration is pending approval from the administrator.</p>
          </section>
        )}

        {voterRegistered && isApproved && (
          <section className="voting-section card">
            <h2>Cast Your Vote</h2>
            {hasVoted ? (
              <div className="already-voted">
                <p>✅ You have already voted. Thank you for participating!</p>
              </div>
            ) : (
              <div className="voting-form">
                <select
                  onChange={(e) => setSelectedCandidate(Number(e.target.value))}
                  className="form-select"
                >
                  <option value="">Select a candidate...</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={voteForCandidate}
                  disabled={!selectedCandidate}
                  className="primary-button"
                >
                  Submit Vote
                </button>
              </div>
            )}
          </section>
        )}

        <section className="results-section card">
          <div className="results-header">
            <h2>Voting Results</h2>
            <button onClick={generatePDF} className="secondary-button">
              Download PDF Report
            </button>
          </div>

          <div className="charts-container">
            <div className="chart-wrapper">
              <h3>Vote Distribution</h3>
              <div className="chart-inner">
                <Pie data={chartData} options={chartOptions} />
              </div>
            </div>
            <div className="chart-wrapper">
              <h3>Vote Comparison</h3>
              <div className="chart-inner">
                <Bar data={chartData} options={barOptions} />
              </div>
            </div>
          </div>

          <div className="results-table">
            <h3>Detailed Results</h3>
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Votes</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.voteCount.toString()}</td>
                    <td>{getCandidatePercentage(c.voteCount)}%</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Total Votes</td>
                  <td>{totalVotes}</td>
                  <td>100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <AboutSection darkMode={darkMode} />
      </main>

      <footer className="app-footer">
        <p>Blockchain Voting DApp - Powered by Ethereum | {aboutInfo.developer.copyright}</p>
      </footer>
    </div>
  );
}

export default App;