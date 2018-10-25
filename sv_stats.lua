local lastPing = {}
local resourceName = GetCurrentResourceName()

local function timeToStr( time )
	local tmp = time
	local s = math.floor(tmp % 60)
	tmp = math.floor( tmp / 60 )
	local m = math.floor(tmp % 60)
	tmp = math.floor( tmp / 60 )
	local h = math.floor(tmp % 24)
	tmp = math.floor( tmp / 24 )
	local d = math.floor(tmp % 7)
	local w = math.floor( tmp / 7 )

	return string.format( "%02is %id %02ih %02im %02is", w, d, h, m, s )
end

local function notifyChat(intSource, stringPrefix, stringMessage, tblColor)
	TriggerClientEvent("chatMessage", intSource, stringPrefix, tblColor or { 187, 0, 0 }, stringMessage)
end

local function GetTrackedData()
	local a = LoadResourceFile(resourceName, "data/trackedData.json")
	return a and json.decode(a) or {}
end

RegisterServerEvent("hardcap:playerActivated")
AddEventHandler("hardcap:playerActivated", function()
	local intSource, identifier, time, playerName = source, GetPlayerIdentifiers(source)[1], os.time(), GetPlayerName(source)

	lastPing[intSource] = time

	local trackedData = GetTrackedData()
	if not trackedData[identifier] then
		trackedData[identifier] = { lastconnection = time, playtime = 0, name = playerName }
	else
		trackedData[identifier].lastconnection = time
		trackedData[identifier].name = playerName
	end
	SaveResourceFile(resourceName, "data/trackedData.json", json.encode(trackedData))
end)

AddEventHandler("playerDropped", function()
	local intSource, identifier, time, playerName, trackedData = source, GetPlayerIdentifiers(source)[1], os.time(), GetPlayerName(source), GetTrackedData()
	if intSource and identifier and trackedData[identifier] and lastPing[intSource] then
		trackedData[identifier].playtime = trackedData[identifier].playtime + os.time() - lastPing[intSource]
		lastPing[intSource] = nil
		SaveResourceFile(resourceName, "data/trackedData.json", json.encode(trackedData))
	end
end)

local function updatePlayersData()
	SetTimeout(112000, function()
		local trackedData = GetTrackedData()

		for k,v in pairs(lastPing) do
			if GetPlayerName(k) then
				local identifier = GetPlayerIdentifiers(k)[1]
				if trackedData[identifier] then
					trackedData[identifier].playtime = trackedData[identifier].playtime + os.time() - v
					lastPing[k] = os.time()
				end
			else
				lastPing[k] = nil
			end
		end

		SaveResourceFile(resourceName, "data/trackedData.json", json.encode(trackedData))
		updatePlayersData()
	end)
end
updatePlayersData()


local function GetIdentifierFromUnk(unkVar, trackedData)
	local idUnk, identifier = ""
	for i = startPos or 1,#unkVar do
		idUnk = idUnk .. unkVar[i] .. (i == #unkVar and "" or " ")
	end

	if string.sub(idUnk, 0, 5) == "steam" then
		identifier = idUnk
	elseif string.sub(idUnk, 0, 6) == "110000" then
		identifier = "steam:" .. idUnk
	elseif string.len(idUnk) > 0 then
		for k,v in pairs(trackedData) do
			if v.name == idUnk then
				identifier = k
				break
			end
		end
	end

	return identifier
end

RegisterCommand("time", function(intSource, tblArgs, stringCommand)
	local trackedData = GetTrackedData()
	local identifier = not tblArgs[1] and GetPlayerIdentifiers(intSource)[1] or GetIdentifierFromUnk(tblArgs, trackedData)
	if not identifier or not trackedData[identifier] then notifyChat(intSource, "[pTracker]", "This identifier returned nothing.") return end

	local data = trackedData[identifier]
	notifyChat(intSource, "[pTracker]", data.name .. " spent: " .. timeToStr(trackedData[identifier].playtime) .. " on the server.")
end)

RegisterCommand("seen", function(intSource, tblArgs, stringCommand)
	local trackedData = GetTrackedData()
	local identifier = not tblArgs[1] and GetPlayerIdentifiers(intSource)[1] or GetIdentifierFromUnk(tblArgs, trackedData)
	if not identifier or not trackedData[identifier] then notifyChat(intSource, "[pTracker]", "This identifier returned nothing.") return end

	notifyChat(intSource, "[pTracker]", "Last seen in game: " ..  os.date("%d-%m %X", trackedData[identifier].lastconnection))
end)

RegisterCommand("leaderboard", function(intSource, tblArgs, stringCommand)
	local trackedData, tbl = GetTrackedData(), {}

	for _,v in pairs(trackedData) do tbl[#tbl + 1] = { playtime = v.playtime, name = v.name } end
	table.sort(tbl, function(a, b) return a.playtime > b.playtime end)

	local str = ""
	for k,v in pairs(tbl) do
		str = str .. k .. ". " .. v.name .. " | " .. timeToStr(v.playtime) .. "\n"
	end

	notifyChat(intSource, "[pTracker]", "Leaderboard\n" .. str)
end)

local count = 0
for _,v in pairs(GetTrackedData()) do count = count + 1 end

print("[pTracker] Successfully loaded: " .. count .. " player(s).")