// UserSidebar 组件展示用户列表，并处理当前用户切换。
import { Wallet } from 'lucide-react';
import type { User } from '../../lib';
import { formatMoney } from './formatters';

type UserSidebarProps = {
  users: User[];
  selectedUserId: number;
  onSelectUser: (userId: number) => void;
};

export function UserSidebar({ users, selectedUserId, onSelectUser }: UserSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sectionTitle">
        <Wallet size={18} />
        <span>Users</span>
      </div>
      <div className="userList">
        {users.map((user) => (
          <button
            className={user.id === selectedUserId ? 'userButton active' : 'userButton'}
            key={user.id}
            type="button"
            onClick={() => onSelectUser(user.id)}
          >
            <span>{user.username}</span>
            <strong>{formatMoney(user.balance)}</strong>
          </button>
        ))}
      </div>
    </aside>
  );
}
