# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from genlayer import *

# EOA interface for sending GEN to a wallet address
# Required to send value to external addresses (docs: value-transfers)
@gl.evm.contract_interface
class _EOA:
    class View:
        pass
    class Write:
        pass


class Rumble(gl.Contract):
    """
    GRumble — AI-narrated Battle Royale.

    Creator sends REAL GEN as the reward (payable).
    Players join FREE — no cost, just sign.
    AI narrates every round of combat.
    Last player standing wins ALL the GEN.
    Profiles track username and all-time wins.
    """

    games:       TreeMap[str, str]   # game_id    -> json(game)
    profiles:    TreeMap[str, str]   # address    -> json({username, wins, games})
    usernames:   TreeMap[str, str]   # name_lower -> address
    game_ids:    DynArray[str]       # ordered game IDs for iteration
    game_count:  u64
    nonce:       u64
    owner:       str

    MIN_PLAYERS = 2
    MAX_PLAYERS = 16
    START_HP    = 100

    def __init__(self):
        self.owner      = str(gl.message.sender_address).lower().strip()
        self.game_count = u64(0)
        self.nonce      = u64(0)
        root = gl.storage.Root.get()
        root.upgraders.get().append(gl.message.sender_address)

    # ── Helpers ──────────────────────────────────────────────
    def _addr(self) -> str: return str(gl.message.sender_address).lower().strip()

    def _get_game(self, gid: str) -> dict:
        raw = self.games.get(gid, None)
        if raw is None: raise Exception("Game not found")
        return json.loads(raw)

    def _save_game(self, gid: str, g: dict):
        self.games[gid] = json.dumps(g)

    def _get_profile(self, addr: str) -> dict:
        raw = self.profiles.get(addr, None)
        return json.loads(raw) if raw else {}

    def _save_profile(self, addr: str, p: dict):
        self.profiles[addr] = json.dumps(p)

    def _roll(self, salt: str, mod: int) -> int:
        n = int(self.nonce)
        self.nonce = u64(n + 1)
        seed = self._addr() + ":" + salt + ":" + str(n)
        h = 5381
        for ch in seed:
            h = ((h << 5) + h + ord(ch)) & 0xFFFFFFFF
        return h % mod

    # ── Views ─────────────────────────────────────────────────
    @gl.public.view
    def get_profile(self, address: str) -> str:
        addr = address.lower().strip()
        raw  = self.profiles.get(addr, None)
        return "NOT_FOUND" if raw is None else raw

    @gl.public.view
    def check_username(self, username: str) -> str:
        key = username.strip().lower()
        return "TAKEN" if self.usernames.get(key, None) is not None else "AVAILABLE"

    @gl.public.view
    def get_game(self, game_id: int) -> str:
        raw = self.games.get(str(game_id), None)
        return "NOT_FOUND" if raw is None else raw

    @gl.public.view
    def get_all_games(self) -> str:
        total = len(self.game_ids)
        if total == 0: return "[]"
        result = []
        for i in range(total):
            gid = self.game_ids[i]
            raw = self.games.get(gid, None)
            if raw is None: continue
            g = json.loads(raw)
            result.append({
                    "id":           g["id"],
                    "name":         g["name"],
                    "status":       g["status"],
                    "player_count": len(g["players"]),
                    "alive_count":  sum(1 for p in g["players"].values() if p["alive"]),
                    "reward_wei":   g["reward_wei"],
                    "round":        g["round"],
                    "winner":       g.get("winner", ""),
                    "creator":      g["creator"],
            })
        return json.dumps(result)

    @gl.public.view
    def get_leaderboard(self) -> str:
        # Iterate game_ids to collect all unique player addresses
        addrs = set()
        for i in range(len(self.game_ids)):
            raw = self.games.get(self.game_ids[i], None)
            if raw is None: continue
            g = json.loads(raw)
            for addr in g.get("players", {}).keys():
                addrs.add(addr)
        if not addrs: return "[]"
        entries = []
        for addr in addrs:
            raw = self.profiles.get(addr, None)
            if raw is None: continue
            p = json.loads(raw)
            entries.append({"address": addr, **p})
        entries.sort(key=lambda x: x.get("wins", 0), reverse=True)
        return json.dumps(entries[:20])

    @gl.public.view
    def get_owner(self) -> str:
        return self.owner

    # ── Profile ───────────────────────────────────────────────

    @gl.public.write
    def upgrade(self, new_code: bytes) -> None:
        """Push a new version without changing the contract address. Deployer only."""
        root = gl.storage.Root.get()
        code = root.code.get()
        code.truncate()
        code.extend(new_code)

    @gl.public.write
    def create_profile(self, username: str):
        """First-time profile setup. Unique username required."""
        caller   = self._addr()
        if self.profiles.get(caller, None) is not None:
            raise Exception("Profile already exists")

        username = username.strip()
        if len(username) < 2 or len(username) > 20:
            raise Exception("Username must be 2-20 characters")
        for ch in username:
            if not (ch.isalnum() or ch in ("-", "_")):
                raise Exception("Letters, numbers, hyphens and underscores only")

        key = username.lower()
        if self.usernames.get(key, None) is not None:
            raise Exception(f"'{username}' is already taken")

        self._save_profile(caller, {"username": username, "wins": 0, "games": 0})
        self.usernames[key] = caller

    @gl.public.write
    def set_username(self, username: str):
        """Change username after profile creation."""
        caller = self._addr()
        p      = self._get_profile(caller)
        if not p:
            raise Exception("Create a profile first")
        username = username.strip()
        if len(username) < 2 or len(username) > 20:
            raise Exception("Username must be 2-20 characters")
        for ch in username:
            if not (ch.isalnum() or ch in ("-", "_")):
                raise Exception("Letters, numbers, hyphens and underscores only")
        key     = username.lower()
        old_key = p.get("username", "").lower()
        existing = self.usernames.get(key, None)
        if existing and existing != caller:
            raise Exception(f"'{username}' is already taken")
        if old_key:
            try: del self.usernames[old_key]
            except: pass
        p["username"] = username
        self._save_profile(caller, p)
        self.usernames[key] = caller

    # ── Game ─────────────────────────────────────────────────

    @gl.public.write.payable
    def create_game(self, name: str):
        """
        Creator sends REAL GEN as the winner's reward.
        gl.message.value is the GEN amount sent with this transaction.
        Players join FREE — reward is already funded.
        """
        caller     = self._addr()
        reward_wei = int(gl.message.value)

        if reward_wei <= 0:
            raise Exception("Send some GEN as the reward (e.g. 0.1 GEN)")

        gid = int(self.game_count)
        self._save_game(str(gid), {
            "id":            gid,
            "name":          name.strip()[:40] or f"Rumble #{gid}",
            "creator":       caller,
            "status":        "WAITING",
            "players":       {},
            "rounds":        [],
            "reward_wei":    reward_wei,
            "round":         0,
            "winner":        "",
            "prize_claimed": False,
        })
        self.game_ids.append(str(gid))
        self.game_count = u64(gid + 1)
        # Creator auto-joins their own game as player 1
        self.games[str(gid)] = json.dumps({
            **json.loads(self.games[str(gid)]),
            "players": {caller: {"hp": self.START_HP, "alive": True, "kills": 0}}
        })

    @gl.public.write
    def join_game(self, game_id: int):
        """
        Join for FREE — just sign the transaction.
        No GEN required from players.
        """
        caller = self._addr()
        gid    = str(game_id)
        g      = self._get_game(gid)
        if self.profiles.get(caller, None) is None:
            raise Exception("Create a profile before joining")
        if g["status"] != "WAITING":
            raise Exception("Game already started or finished")
        if caller in g["players"]:
            raise Exception("Already joined this Rumble")
        if len(g["players"]) >= self.MAX_PLAYERS:
            raise Exception(f"Lobby full (max {self.MAX_PLAYERS})")

        g["players"][caller] = {"hp": self.START_HP, "alive": True, "kills": 0}
        self._save_game(gid, g)

        # Track in profile
        p = self._get_profile(caller)
        if p:
            p["games"] = p.get("games", 0) + 1
            self._save_profile(caller, p)

    @gl.public.write
    def start_game(self, game_id: int):
        """Creator starts when ready."""
        caller = self._addr()
        gid = str(game_id)
        g = self._get_game(gid)
        if g["creator"] != caller:
            raise Exception("Only the creator can start")
        if g["status"] != "WAITING":
            raise Exception("Game already started")
        if len(g["players"]) < self.MIN_PLAYERS:
            raise Exception(f"Need at least {self.MIN_PLAYERS} players")
        g["status"] = "ACTIVE"
        self._save_game(gid, g)

    @gl.public.write
    def play_round(self, game_id: int):
        """
        Permissionless — anyone triggers a round.
        Random battle events generated, AI narrates dramatically,
        damage applied, dead players eliminated.
        """
        gid = str(game_id)
        g   = self._get_game(gid)
        if g["status"] != "ACTIVE":
            raise Exception("Game is not active")

        players = g["players"]
        alive   = [a for a, p in players.items() if p["alive"]]
        if len(alive) <= 1:
            raise Exception("Game already has a winner")

        round_num = g["round"] + 1

        # ── Random events ────────────────────────────────────
        events = []
        for i, attacker in enumerate(alive):
            roll = self._roll(f"act_{round_num}_{i}", 10)
            if roll < 5:
                others = [a for a in alive if a != attacker]
                if others:
                    target = others[self._roll(f"tgt_{round_num}_{i}", len(others))]
                    dmg    = 10 + self._roll(f"dmg_{round_num}_{i}", 40)
                    events.append({"type":"attack","attacker":attacker,"target":target,"value":dmg})
            elif roll < 7:
                heal = 10 + self._roll(f"heal_{round_num}_{i}", 25)
                events.append({"type":"heal","player":attacker,"value":heal})
            elif roll == 7:
                sp_types = ["meteor","lightning","poison_gas","earthquake"]
                sp_type  = sp_types[self._roll(f"sp_{round_num}_{i}", 4)]
                target   = alive[self._roll(f"sp_t_{round_num}_{i}", len(alive))]
                sp_dmg   = 15 + self._roll(f"sp_d_{round_num}_{i}", 35)
                events.append({"type":"special","subtype":sp_type,"targets":[target],"value":sp_dmg})

        # ── Apply damage/healing ─────────────────────────────
        dmg_map  = {a: 0 for a in alive}
        heal_map = {a: 0 for a in alive}
        for ev in events:
            if ev["type"] == "attack":
                dmg_map[ev["target"]] = dmg_map.get(ev["target"], 0) + ev["value"]
            elif ev["type"] == "heal":
                heal_map[ev["player"]] = heal_map.get(ev["player"], 0) + ev["value"]
            elif ev["type"] == "special":
                for t in ev.get("targets", []):
                    dmg_map[t] = dmg_map.get(t, 0) + ev["value"]
        for addr in alive:
            p = players[addr]
            p["hp"] = max(0, min(self.START_HP, p["hp"] + heal_map.get(addr, 0) - dmg_map.get(addr, 0)))

        # ── AI narration with usernames ───────────────────────
        def _name(addr):
            p = self._get_profile(addr)
            return p.get("username", addr[-6:]) if p else addr[-6:]

        alive_str  = ", ".join([f"{_name(a)}(HP:{players[a]['hp']})" for a in alive])
        events_str = json.dumps(events[:5])

        def narrate():
            prompt = (
                "You are the announcer for GRumble, an AI battle royale.\n\n"
                "ROUND: " + str(round_num) + "\n"
                "FIGHTERS: " + alive_str + "\n"
                "EVENTS: " + events_str + "\n\n"
                "Write a dramatic 3-4 sentence battle narration. "
                "Use player names. Reference actual events. "
                "Be entertaining and build tension. Under 280 chars. "
                "Build suspense if multiple players remain."
            )
            return str(gl.nondet.exec_prompt(prompt))

        narrative = str(gl.eq_principle.prompt_non_comparative(
            narrate,
            task="Write a dramatic battle royale round narration.",
            criteria="Validate format only. Accept if response is a non-empty string of 1-5 sentences under 350 chars. Do NOT re-evaluate battle events.",
        )).strip()[:350]

        # ── Eliminations ─────────────────────────────────────
        eliminated = []
        for addr in alive:
            if players[addr]["hp"] <= 0:
                players[addr]["alive"] = False
                eliminated.append(addr)
                for ev in events:
                    killer = ev.get("attacker", "")
                    if ev.get("target") == addr or addr in ev.get("targets", []):
                        if killer and killer in players:
                            players[killer]["kills"] = players[killer].get("kills", 0) + 1
                        break

        g["rounds"].append({
            "round":       round_num,
            "narrative":   narrative,
            "eliminated":  eliminated,
            "hp_snapshot": {a: players[a]["hp"] for a in alive},
        })
        g["round"]   = round_num
        g["players"] = players

        # ── Check winner ─────────────────────────────────────
        still_alive = [a for a, p in players.items() if p["alive"]]
        if len(still_alive) <= 1:
            winner      = still_alive[0] if still_alive else alive[-1]
            g["winner"] = winner
            g["status"] = "FINISHED"
            wp = self._get_profile(winner)
            if wp:
                wp["wins"] = wp.get("wins", 0) + 1
                self._save_profile(winner, wp)

        self._save_game(gid, g)


    @gl.public.write
    def cancel_game(self, game_id: int):
        """
        Creator cancels a WAITING game and recovers the prize GEN.
        Only works before the game starts — protects creator from stuck funds.
        """
        caller = self._addr()
        gid    = str(game_id)
        g      = self._get_game(gid)
        if g["creator"] != caller:
            raise Exception("Only the creator can cancel")
        if g["status"] != "WAITING":
            raise Exception("Can only cancel games that haven't started")
        g["status"] = "CANCELLED"
        self._save_game(gid, g)
        # Refund prize GEN to creator
        reward_wei = u256(int(g["reward_wei"]))
        _EOA(Address(caller)).emit_transfer(value=reward_wei)

    @gl.public.write
    def claim_prize(self, game_id: int):
        """
        Winner claims the real GEN reward.
        Transfers reward_wei from contract balance to winner.
        """
        caller = self._addr()
        gid    = str(game_id)
        g      = self._get_game(gid)
        if g["status"] != "FINISHED":
            raise Exception("Game not finished yet")
        if g["winner"] != caller:
            raise Exception("You are not the winner")
        if g.get("prize_claimed"):
            raise Exception("Prize already claimed")

        g["prize_claimed"] = True
        self._save_game(gid, g)

        # Send real GEN to winner via EOA external message (docs: value-transfers)
        reward_wei = u256(int(g["reward_wei"]))
        _EOA(Address(caller)).emit_transfer(value=reward_wei)
