curl --request POST \
     --url https://eth-sepolia.g.alchemy.com/v2/docs-demo \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '
{
  "id": 1,
  "jsonrpc": "2.0",
  "method": "eth_getUserOperationByHash",
  "params": [
    "0x82e9dfddcc75651ba6cc16e56ebd4efa3ade7df7c3a4c171f4335f9357c4a4ce"
  ]
}
'
