export const mockChats = [
  {
    id: '1',
    name: 'Alice Smith',
    initials: 'AS',
    color: '#ff5e5e',
    lastMessage: 'Sounds good, see you then!',
    timestamp: '10:42 AM',
    unread: 2,
    online: true,
    messages: [
      { id: 1, text: 'Hey, are we still on for lunch?', time: '10:30 AM', isMe: false },
      { id: 2, text: 'Yes! Let\'s meet at the usual place.', time: '10:35 AM', isMe: true },
      { id: 3, text: 'Sounds good, see you then!', time: '10:42 AM', isMe: false }
    ]
  },
  {
    id: '2',
    name: 'Bob Johnson',
    initials: 'BJ',
    color: '#34c759',
    lastMessage: 'Can you send me the files?',
    timestamp: 'Yesterday',
    unread: 0,
    online: false,
    messages: [
      { id: 1, text: 'Can you send me the files?', time: 'Yesterday', isMe: false }
    ]
  },
  {
    id: '3',
    name: 'Design Team',
    initials: 'DT',
    color: '#2AABEE',
    lastMessage: 'Charlie: The new mocks are up.',
    timestamp: 'Yesterday',
    unread: 5,
    online: true,
    messages: [
      { id: 1, text: 'Charlie: The new mocks are up.', time: 'Yesterday', isMe: false }
    ]
  },
  {
    id: '4',
    name: 'Diana Prince',
    initials: 'DP',
    color: '#ff9500',
    lastMessage: 'Thanks!',
    timestamp: 'Tuesday',
    unread: 0,
    online: false,
    messages: [
      { id: 1, text: 'Thanks!', time: 'Tuesday', isMe: false }
    ]
  },
  {
    id: '5',
    name: 'Eve Adams',
    initials: 'EA',
    color: '#af52de',
    lastMessage: 'Are we deploying today?',
    timestamp: 'Monday',
    unread: 0,
    online: true,
    messages: [
      { id: 1, text: 'Are we deploying today?', time: 'Monday', isMe: false }
    ]
  },
  {
    id: '6',
    name: 'Frank Castle',
    initials: 'FC',
    color: '#ff3b30',
    lastMessage: 'I will be late to the meeting.',
    timestamp: 'Oct 12',
    unread: 1,
    online: false,
    messages: [
      { id: 1, text: 'I will be late to the meeting.', time: 'Oct 12', isMe: false }
    ]
  },
  {
    id: '7',
    name: 'Grace Hopper',
    initials: 'GH',
    color: '#5ac8fa',
    lastMessage: 'Got it.',
    timestamp: 'Oct 10',
    unread: 0,
    online: false,
    messages: [
      { id: 1, text: 'Got it.', time: 'Oct 10', isMe: false }
    ]
  },
  {
    id: '8',
    name: 'Hank Pym',
    initials: 'HP',
    color: '#ffcc00',
    lastMessage: 'Check out this new framework.',
    timestamp: 'Oct 8',
    unread: 0,
    online: true,
    messages: [
      { id: 1, text: 'Check out this new framework.', time: 'Oct 8', isMe: false }
    ]
  }
];
