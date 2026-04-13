!pip install paho-mqtt

import json
import time
import random
from datetime import datetime
import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion # importação obrigatória na versão nova

#configurações do MQTT
MQTT_SERVER = "98.81.139.246"
MQTT_PORT = 1883
MQTT_TOPIC = "datacenter/rack01/status" # tópico alinhado com o Node-RED

#Correção da API: Declarando a versão 2 do Paho MQTT
client = mqtt.Client(CallbackAPIVersion.VERSION2)

print(f"Conectando ao broker {MQTT_SERVER}...")
client.connect(MQTT_SERVER, MQTT_PORT, 60)

#Correção do Loop: Inicia a thread de rede do MQTT em segundo plano
client.loop_start()
print("Conectado! Iniciando simulação do Rack de Servidores...")

def build_json(temp, corrente, porta):
    data = {
        "rack_id": "RACK-01",
        "temperatura": round(temp, 2),
        "corrente_amperes": round(corrente, 2),
        "porta_aberta": porta,
        "timestamp": datetime.now().isoformat()
    }
    return json.dumps(data)

try:
    while True:
        #Correção do Tema: Simulando os dados do seu Rack
        temperatura = random.uniform(20.0, 35.0) # Temperatura entre 20 e 35 graus
        corrente = random.uniform(10.0, 25.0)    # Corrente entre 10 e 25 Amperes

        #Sorteia se a porta está aberta ou fechada (com mais chance de estar fechada)
        porta_aberta = random.choice([True, False, False, False])

        payload = build_json(temperatura, corrente, porta_aberta)

        client.publish(MQTT_TOPIC, payload)
        print("Enviado:", payload)

        time.sleep(5)

except KeyboardInterrupt:
    #Permite parar o código graciosamente clicando no "Stop" do Colab
    print("\nSimulação encerrada.")
    client.loop_stop()
    client.disconnect()