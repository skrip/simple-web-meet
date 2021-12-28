import React, {useEffect, useState, useRef} from 'react';
import {Device} from 'mediasoup-client';
import {
  TransportOptions,
  RtpCapabilities,
  ConsumerOptions,
  DtlsParameters,
  RtpParameters,
} from 'mediasoup-client/lib/types';
import {useSelector, useDispatch} from 'react-redux';
import {store} from '../lib/store';
import {
  addParticipant,
  removeParticipant,
  updateOwner,
} from '../lib/messageSlice';
import {RootState} from '../lib/store';
import {useParams} from 'react-router-dom';

export interface Message {
  method: string;
  response: {
    result: number;
    [key: string]: unknown;
  };
}

const device = new Device();

export function Meeting() {
  const participants = useSelector(
    (state: RootState) => state.message.participant,
  );
  const dispatch = useDispatch();

  const params = useParams();

  const [roomName, setRoomName] = useState<string>();
  const [client, setClient] = useState<WebSocket>();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const videoproducer = useRef<HTMLVideoElement>(null!);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const videomain = useRef<HTMLVideoElement>(null!);

  const videoconsumers = useRef<(HTMLVideoElement | null)[]>([]);

  const createConsumerTransport = (
    data: TransportOptions,
    participantName: string,
  ) => {
    const partis = store.getState().message.participant;
    const member = partis.find(dt => {
      return dt.participantName == participantName;
    });
    if (member) {
      console.error('member sudah ada ', participantName);
      return;
    }

    const consumerTransport = device?.createRecvTransport(data);
    console.log('buat createConsumerTransport ', consumerTransport);
    consumerTransport?.on(
      'connect',
      ({dtlsParameters}, callback: () => void) => {
        const ddtlsParameters = dtlsParameters as DtlsParameters;
        client?.send(
          JSON.stringify({
            method: 'connectConsumerTransport',
            data: {
              dtlsParameters: ddtlsParameters,
              participantName,
            },
          }),
        );
        callback();
        console.log('kirim connect ConsumerTransport');
      },
    );

    consumerTransport?.on('connectionstatechange', state => {
      switch (state) {
        case 'connecting':
          console.log('connecting consumer');
          break;

        case 'connected':
          console.log('connected consumer resume');
          client?.send(
            JSON.stringify({
              method: 'resume',
              data: {
                participantName,
              },
            }),
          );
          break;

        case 'failed':
          console.log('failed consumer');
          consumerTransport?.close();
          break;

        default:
          break;
      }
    });

    const remoteStream = new MediaStream();
    remoteStream.onaddtrack = () => {
      console.log('ADD TRACK');
    };
    remoteStream.onremovetrack = () => {
      console.log('REMOVE TRACK');
    };

    dispatch(
      addParticipant({
        no: partis.length + 1,
        participantName: participantName,
        transport: consumerTransport,
        remoteStream: remoteStream,
      }),
    );
  };

  const createTransport = async (data: TransportOptions) => {
    const sendTransport = device?.createSendTransport(data);
    console.log('masuk ke sendTransport device ', device);
    console.log('masuk ke sendTransport ', sendTransport);

    sendTransport?.on('connect', ({dtlsParameters}, callback: () => void) => {
      const ddtlsParameters = dtlsParameters as DtlsParameters;
      client?.send(
        JSON.stringify({
          method: 'connectProducerTransport',
          data: {
            id: sendTransport?.id,
            dtlsParameters: ddtlsParameters,
          },
        }),
      );
      callback();
      console.log('kirim connectProducerTransport ');
    });

    sendTransport?.on(
      'produce',
      ({kind, rtpParameters, appData}, callback: ({}) => void) => {
        const kkind = kind as string;
        const rrtpParameters = rtpParameters as RtpParameters;
        client?.send(
          JSON.stringify({
            method: 'produce',
            data: {
              transportId: sendTransport?.id,
              kind: kkind,
              rtpParameters: rrtpParameters,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              appData,
            },
          }),
        );

        const id = sendTransport?.id;
        callback({id});
        console.log('kirim produce ', kind);
      },
    );

    sendTransport?.on('connectionstatechange', state => {
      console.log('ada state ');
      switch (state) {
        case 'connecting':
          console.log('connecting ');
          break;
        case 'connected':
          console.log('====== connected ');
          break;
        case 'failed':
          console.log('failed ');
          sendTransport?.close();
          break;
        default:
          break;
      }
    });
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    const webcamTrack = localStream.getVideoTracks()[0];
    await sendTransport?.produce({
      track: webcamTrack,
      encodings: [
        {maxBitrate: 100000},
        {maxBitrate: 300000},
        {maxBitrate: 900000},
      ],
      codecOptions: {
        videoGoogleStartBitrate: 1000,
      },
    });

    const audioTrack = localStream.getAudioTracks()[0];
    await sendTransport?.produce({track: audioTrack});

    videoproducer.current.srcObject = localStream;
    videoproducer.current.muted = true;

    videomain.current.srcObject = localStream;
    videomain.current.muted = true;

    client?.send(
      JSON.stringify({
        method: 'getRoomProducers',
      }),
    );
  };

  useEffect(() => {
    if (params.roomname) {
      setRoomName(params.roomname);
    }
  }, [params.roomname]);

  async function consume(data: Message) {
    const partis = store.getState().message.participant;
    const participantName = data.response.participantName as string;
    const member = partis.find(dt => {
      return dt.participantName == participantName;
    });
    if (member) {
      const remoteStream = member.remoteStream;
      const consumerTransport = member.transport;
      const videoconsumer = videoconsumers.current[member.no - 1];
      console.log(' videoconsumer ', videoconsumer);
      if (videoconsumer) {
        videoconsumer.srcObject = remoteStream;
        const dt = data.response.transport as ConsumerOptions;
        try {
          const consumer = await consumerTransport?.consume(dt);
          const track: MediaStreamTrack = consumer.track;
          track.onended = () => {
            console.log('track on ended');
          };
          track.onmute = () => {
            console.log('track on mute');
          };
          track.onunmute = () => {
            console.log('track on unmute');
          };
          console.log('TRACK ', track);
          remoteStream.addTrack(track);
        } catch (error) {
          console.error('error video ', error);
        }
      }
    }
  }

  const proses = () => {
    if (client) {
      if (client.readyState == 1) {
        console.log('ready state');
        client.send(
          JSON.stringify({
            method: 'LOGIN',
          }),
        );
      }
      client.onopen = () => {
        client.send(
          JSON.stringify({
            method: 'LOGIN',
          }),
        );
        console.log('WebSocket Client Connected and send');
      };
      client.onmessage = async message => {
        const data: Message = JSON.parse(message.data as string) as Message;
        if (data.method === 'LOGIN') {
          console.log('response LOGIN ', data.response);

          const owner = store.getState().message.owner;
          console.log('=== owner ', owner);
          client?.send(
            JSON.stringify({
              method: 'joinRoom',
              data: {
                participantName: owner.name,
                roomName: roomName,
              },
            }),
          );
        } else if (data.method === 'joinRoom') {
          if (data.response.result == 200) {
            client?.send(
              JSON.stringify({
                method: 'getRouteCapability',
              }),
            );
          }
        } else if (data.method === 'getRouteCapability') {
          if (data.response.result == 200) {
            console.log('getRouteCapability ', device);
            const routerRtpCapabilities = data.response
              .rtpCapabilities as RtpCapabilities;
            try {
              await device?.load({routerRtpCapabilities});
              client?.send(
                JSON.stringify({
                  method: 'createTransport',
                  data: {
                    type: 'producer',
                  },
                }),
              );
            } catch (error) {
              console.error(error);
            }
          }
        } else if (data.method === 'createTransport') {
          if (data.response.result == 200) {
            console.log(data.response);
            const lcreateTransport = data.response
              .createTransport as TransportOptions;
            const participantName = data.response.participantName as string;
            if (data.response.type == 'producer') {
              await createTransport(lcreateTransport);
            } else if (data.response.type == 'consumer') {
              createConsumerTransport(lcreateTransport, participantName);
            }
          }
        } else if (data.method === 'new_producer_transport') {
          if (data.response.participantName) {
            const participantName = data.response.participantName as string;
            console.log(data.response);
            const partis = store.getState().message.participant;
            const member = partis.find(dt => {
              return dt.participantName == participantName;
            });
            if (member) {
              console.error('&&&&& member EXISTS ', participantName);
            } else {
              if (data.response.participantName) {
                client?.send(
                  JSON.stringify({
                    method: 'createTransport',
                    data: {
                      type: 'consumer',
                      participantName: participantName,
                    },
                  }),
                );
              }
            }
          }
        } else if (data.method === 'new_producer') {
          console.log('ADA NEW PRODUCER ', data.response);
          const participantName = data.response.participantName as string;
          const producerId = data.response.producerId as string;
          const kind = data.response.kind as string;
          const partis = store.getState().message.participant;
          const member = partis.find(dt => {
            return dt.participantName == data.response.participantName;
          });
          if (member) {
            const rtpCapabilities = device?.rtpCapabilities;
            console.log('masuk siniiiii ConsumerTransport ');
            client?.send(
              JSON.stringify({
                method: 'consume',
                data: {
                  rtpCapabilities,
                  participantName: participantName,
                  kind: kind,
                  producerId: producerId,
                },
              }),
            );
          }
        } else if (data.method === 'consume') {
          await consume(data);
        } else if (data.method === 'clientClose') {
          console.log('client close : ', data);
          const participantName = data.response.participantName as string;
          dispatch(removeParticipant(participantName));
        } else if (data.method === 'ActiveSpeaker') {
          console.log('SET SPEAKER ', data);
          const participantName = data.response.participantName as string;
          const partis = store.getState().message.participant;
          const member = partis.find(dt => {
            return dt.participantName == participantName;
          });
          if (member) {
            videomain.current.srcObject = member.remoteStream;
            videomain.current.muted = true;
          }
        }
      };

      client.onerror = err => {
        console.error(err);
      };
    }
  };

  useEffect(() => {
    let scheme = 'ws';
    const protocol = location.protocol;
    if (protocol == 'https:') {
      scheme = 'wss';
    }
    const domain = location.hostname;
    const port = location.port;
    const cl = new WebSocket(`${scheme}://${domain}:${port}/websocket`);
    setClient(cl);
  }, []);

  useEffect(() => {
    const owner = store.getState().message.owner;
    if (owner.name === '') {
      window.location.href = '/';
      /*dispatch(
        updateOwner({
          name: 'testing',
        }),
      );*/
    }
    if (client) {
      proses();
    }
  }, [client]);

  return (
    <div className="flex flex-col justify-between h-screen">
      <div className="flex flex-col h-auto">
        <div className="z-10 flex flex-row justify-center items-center bg-stone-900 border-b pb-4 h-8">
          <div className="text-white mt-3 text-sm">SIMPLE WEB MEET</div>
        </div>

        <div className="z-0 bg-black flex flex-col justify-center h-full">
          <video
            style={{height: '480px'}}
            className="object-contain"
            ref={videomain}
            autoPlay
            playsInline
          />
        </div>
      </div>

      <div className="z-10 flex flex-row items-center justify-center bg-stone-900 border-t h-40">
        <div className="flex flex-col bg-black m-2">
          <video
            width="130"
            className="p-2"
            ref={videoproducer}
            autoPlay
            playsInline
          />
          <div className="text-center text-xs text-white">You</div>
        </div>
        {participants.map((parti, idx) => {
          return (
            <div key={idx} className="flex flex-col bg-black m-2">
              <video
                width="130"
                className="p-2"
                ref={ref => (videoconsumers.current[idx] = ref)}
                autoPlay
                playsInline
              />
              <div className="text-center text-xs text-white">
                {parti.participantName}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
