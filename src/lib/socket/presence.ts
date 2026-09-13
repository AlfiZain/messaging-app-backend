const userSockets = new Map<string, Set<string>>();

export function addUserSocket(userId: string, socketId: string) {
  const sockets = userSockets.get(userId);

  if (sockets) {
    sockets.add(socketId);
    return false;
  }

  userSockets.set(userId, new Set([socketId]));

  return true;
}

export function removeUserSocket(userId: string, socketId: string) {
  const sockets = userSockets.get(userId);

  if (!sockets) {
    return false;
  }

  sockets.delete(socketId);

  if (sockets.size > 0) {
    return false;
  }

  userSockets.delete(userId);
  return true;
}

export function isUserOnline(userId: string) {
  return userSockets.has(userId);
}

export function getOnlineUserIds(userIds: string[]) {
  return userIds.filter((userId) => isUserOnline(userId));
}
