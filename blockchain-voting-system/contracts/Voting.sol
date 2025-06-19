// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Voting {
    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    struct Voter {
        address voterAddress;
        string idHash;
        bool isApproved;
        bool hasVoted;
    }

    address public owner;
    uint public candidateCount;
    uint public totalVotes;
    bool public votingOpen;

    mapping(uint => Candidate) public candidates;
    mapping(string => bool) private candidateNameExists;
    mapping(address => Voter) public voters;
    address[] public voterAddresses;

    event CandidateAdded(uint indexed id, string name);
    event VoterRegistered(address indexed voter, string idHash);
    event VoterApproved(address indexed voter);
    event VoteCast(address indexed voter, uint indexed candidateId);
    event VotingStatusChanged(bool newStatus);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyApprovedVoter() {
        require(voters[msg.sender].isApproved, "Not an approved voter");
        _;
    }

    modifier votingIsOpen() {
        require(votingOpen, "Voting is currently closed");
        _;
    }

    constructor() {
        owner = msg.sender;
        votingOpen = false; // Default to closed
        _addInitialCandidates();
    }

    function _addInitialCandidates() private {
        _addCandidate("RUTO");
        _addCandidate("MATIANGI");
        _addCandidate("GACHAGUA");
    }

    // Admin functions
    function toggleVoting(bool _status) external onlyOwner {
        votingOpen = _status;
        emit VotingStatusChanged(_status);
    }

    function addCandidate(string memory _name) external onlyOwner {
        _addCandidate(_name);
    }

    function _addCandidate(string memory _name) private {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(!candidateNameExists[_name], "Candidate already exists");

        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, _name, 0);
        candidateNameExists[_name] = true;

        emit CandidateAdded(candidateCount, _name);
    }

    // Voter functions
    function registerVoter(string memory _idHash) external {
        require(bytes(_idHash).length > 0, "ID hash cannot be empty");
        require(!isRegistered(msg.sender), "Already registered");

        voters[msg.sender] = Voter(msg.sender, _idHash, false, false);
        voterAddresses.push(msg.sender);

        emit VoterRegistered(msg.sender, _idHash);
    }

    function approveVoter(address _voter) external onlyOwner {
        require(isRegistered(_voter), "Voter not registered");
        require(!voters[_voter].isApproved, "Already approved");

        voters[_voter].isApproved = true;

        emit VoterApproved(_voter);
    }

    // Voting
    function vote(uint _candidateId) external votingIsOpen onlyApprovedVoter {
        require(!voters[msg.sender].hasVoted, "Already voted");
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");

        voters[msg.sender].hasVoted = true;
        candidates[_candidateId].voteCount++;
        totalVotes++;

        emit VoteCast(msg.sender, _candidateId);
    }

    // Helper
    function isRegistered(address _voter) public view returns (bool) {
        return voters[_voter].voterAddress != address(0);
    }

    // View Functions
    function getCandidate(uint _id) public view returns (Candidate memory) {
        return candidates[_id];
    }

    function getAllCandidates() public view returns (Candidate[] memory) {
        Candidate[] memory all = new Candidate[](candidateCount);
        for (uint i = 1; i <= candidateCount; i++) {
            all[i - 1] = candidates[i];
        }
        return all;
    }

    function getPendingVoters() public view onlyOwner returns (Voter[] memory) {
        uint count;
        for (uint i = 0; i < voterAddresses.length; i++) {
            if (!voters[voterAddresses[i]].isApproved) {
                count++;
            }
        }

        Voter[] memory pending = new Voter[](count);
        uint index;
        for (uint i = 0; i < voterAddresses.length; i++) {
            if (!voters[voterAddresses[i]].isApproved) {
                pending[index] = voters[voterAddresses[i]];
                index++;
            }
        }
        return pending;
    }

    function getApprovedVoters() public view onlyOwner returns (Voter[] memory) {
        uint count;
        for (uint i = 0; i < voterAddresses.length; i++) {
            if (voters[voterAddresses[i]].isApproved) {
                count++;
            }
        }

        Voter[] memory approved = new Voter[](count);
        uint index;
        for (uint i = 0; i < voterAddresses.length; i++) {
            if (voters[voterAddresses[i]].isApproved) {
                approved[index] = voters[voterAddresses[i]];
                index++;
            }
        }
        return approved;
    }

    function getWinner() public view returns (Candidate memory) {
        require(!votingOpen, "Voting is still ongoing");
        require(candidateCount > 0, "No candidates available");

        uint maxVotes = 0;
        uint winnerId = 1;

        for (uint i = 1; i <= candidateCount; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winnerId = i;
            }
        }

        return candidates[winnerId];
    }
}
