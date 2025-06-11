// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MessagePortal {
    // Total number of messages ever sent
    uint256 public totalMessages;

    // Structure to hold each message’s data
    struct Message {
        uint256 nonce;
        address messager;        // Who messaged
        uint256 timestamp;    // When they messaged
        string message;       // What they said
        string message2;       // What they said
        uint256 fragment;
    }

    // Array of all messages
    Message[] public messages;

    // Event emitted when someone messages
    event NewMessage(uint256 nonce, address indexed from, uint256 timestamp, string message, string message2, uint256 fragment);

    // Simple constructor — nothing to do yet
    constructor() {}

    /// @notice Send a message along with a message!
    /// @param _message A short message to include with your message
    function message(uint256 _nonce, string memory _message, string memory _message2, uint256 _fragment) public {
        totalMessages += 1;  // bump the counter

        // Store this message
        messages.push(Message({
            nonce: _nonce,
            messager: msg.sender,
            timestamp: block.timestamp,
            message: _message,
            message2: _message2,
            fragment: _fragment
        }));

        // Emit an event so front-ends can listen for new messages
        emit NewMessage(_nonce, msg.sender, block.timestamp, _message, _message2, _fragment);
    }

    /// @notice Retrieve the total number of messages so far
    function getTotalMessages() public view returns (uint256) {
        return totalMessages;
    }

    /// @notice Get the full list of all messages
    function getAllMessages() public view returns (Message[] memory) {
        return messages;
    }
}
