import React, {useEffect, useState, useRef} from 'react';
import {Device} from 'mediasoup-client';
import {
  TransportOptions,
  RtpCapabilities,
  ConsumerOptions,
  DtlsParameters,
  RtpParameters,
  Transport,
} from 'mediasoup-client/lib/types';
import {useSelector, useDispatch} from 'react-redux';
import {store} from '../lib/store';
import {
  addParticipant,
  removeParticipant,
  updateParticipantIsScreenShare,
} from '../lib/messageSlice';
import {RootState} from '../lib/store';
import {useParams} from 'react-router-dom';
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
} from 'react-icons/fa';
import {MdScreenShare, MdStopScreenShare} from 'react-icons/md';
import classNames from 'classnames';

export interface Message {
  method: string;
  response: {
    result: number;
    [key: string]: unknown;
  };
}

const device = new Device();
let localStream: MediaStream;
let screenShareRemoteStream: MediaStream;
let screenShareStream: MediaStream;
let screenShareTrack: MediaStreamTrack;
let webcamTrack: MediaStreamTrack;
let audioTrack: MediaStreamTrack;
let sendTransport: Transport;

export function Meeting() {
  const participants = useSelector(
    (state: RootState) => state.message.participant,
  );
  const dispatch = useDispatch();
  const [isBlocking, setIsBlocking] = useState(false);

  const params = useParams();

  const [roomName, setRoomName] = useState<string>();
  const [client, setClient] = useState<WebSocket>();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const videoproducer = useRef<HTMLVideoElement>(null!);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const videomain = useRef<HTMLVideoElement>(null!);

  const videoconsumers = useRef<(HTMLVideoElement | null)[]>([]);
  const [audioPause, setAudioPause] = useState<boolean>(false);
  const [videoPause, setVideoPause] = useState<boolean>(false);
  const [screenShare, setScreenShare] = useState<boolean>(false);

  const createConsumerTransport = (
    data: TransportOptions,
    participantName: string,
  ) => {
    const partis = store.getState().message.participant;
    const member = partis.find(dt => {
      return dt.participantName == participantName;
    });
    if (member) {
      return;
    }

    const consumerTransport = device?.createRecvTransport(data);
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
      },
    );

    consumerTransport?.on('connectionstatechange', state => {
      switch (state) {
        case 'connecting':
          console.log('consumer connecting');
          break;

        case 'connected':
          console.log('consumer konekted lagi');
          client?.send(
            JSON.stringify({
              method: 'resume',
              data: {
                participantName,
                type: '',
              },
            }),
          );
          break;

        case 'failed':
          console.log('consumer failed');
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
        is_screen_share: false,
      }),
    );
  };

  const createTransport = async (data: TransportOptions) => {
    sendTransport = device?.createSendTransport(data);

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

    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    webcamTrack = localStream.getVideoTracks()[0];
    await sendTransport?.produce({
      track: webcamTrack,
      encodings: [
        {maxBitrate: 100000},
        {maxBitrate: 300000},
        {maxBitrate: 900000},
      ],
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      codec: device.rtpCapabilities.codecs!.find(
        codec => codec.mimeType.toLowerCase() === 'video/h264',
      ),
      appData: {nama: 'satu'},
    });

    audioTrack = localStream.getAudioTracks()[0];
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
      const type = data.response.type as string;
      if (type == 'screen_share') {
        const consumerTransport = member.transport;
        const dt = data.response.transport as ConsumerOptions;
        try {
          screenShareRemoteStream = new MediaStream();
          const consumer = await consumerTransport?.consume(dt);
          const track: MediaStreamTrack = consumer.track;
          console.log('consume scren share');
          videomain.current.srcObject = screenShareRemoteStream;

          track.onended = () => {
            console.log('track on ended');
          };
          track.onmute = () => {
            console.log('track on mute');
          };
          track.onunmute = () => {
            console.log('track on unmute');
          };
          screenShareRemoteStream.addTrack(track);

          dispatch(
            updateParticipantIsScreenShare({
              name: member.participantName,
              is_screen_share: true,
            }),
          );

          client?.send(
            JSON.stringify({
              method: 'resume',
              data: {
                participantName,
                type: 'screen_share',
              },
            }),
          );
        } catch (error) {
          console.error('error video ', error);
        }
      } else {
        const remoteStream = member.remoteStream;
        const consumerTransport = member.transport;
        const videoconsumer = videoconsumers.current[member.no - 1];
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
            remoteStream.addTrack(track);
          } catch (error) {
            console.error('error video ', error);
          }
        }
      }
    }
  }

  const proses = () => {
    if (client) {
      if (client.readyState == 1) {
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
      };
      client.onmessage = async message => {
        const data: Message = JSON.parse(message.data as string) as Message;
        if (data.method === 'LOGIN') {
          const owner = store.getState().message.owner;
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
          const participantName = data.response.participantName as string;
          const producerId = data.response.producerId as string;
          const kind = data.response.kind as string;
          const type = data.response.type as string;
          const partis = store.getState().message.participant;
          const member = partis.find(dt => {
            return dt.participantName == data.response.participantName;
          });
          if (member) {
            const rtpCapabilities = device?.rtpCapabilities;
            client?.send(
              JSON.stringify({
                method: 'consume',
                data: {
                  rtpCapabilities,
                  participantName: participantName,
                  kind: kind,
                  producerId: producerId,
                  type: type,
                },
              }),
            );
          }
        } else if (data.method === 'consume') {
          await consume(data);
        } else if (data.method === 'clientClose') {
          const participantName = data.response.participantName as string;
          dispatch(removeParticipant(participantName));

          //const owner = store.getState().message.owner;
          videomain.current.srcObject = localStream;
          videomain.current.muted = true;
        } else if (data.method === 'ActiveSpeaker') {
          const participantName = data.response.participantName as string;
          const partis = store.getState().message.participant;
          const member = partis.find(dt => {
            return dt.participantName == participantName;
          });
          if (member) {
            if (!member.is_screen_share) {
              videomain.current.srcObject = member.remoteStream;
              videomain.current.muted = true;
            }
          } else {
            const owner = store.getState().message.owner;
            if (owner.name == participantName) {
              videomain.current.srcObject = localStream;
              videomain.current.muted = true;
            }
          }
        } else if (data.method === 'closeScreenShare') {
          console.log('Close Screen Share');
          const participantName = data.response.participantName as string;
          const partis = store.getState().message.participant;
          const member = partis.find(dt => {
            return dt.participantName == participantName;
          });
          if (member) {
            dispatch(
              updateParticipantIsScreenShare({
                name: member.participantName,
                is_screen_share: false,
              }),
            );
            videomain.current.srcObject = localStream;
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

  const onUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = 'Are you sure you want to exit?';
  };

  const onBackButtonEvent = (e: PopStateEvent) => {
    e.preventDefault();
    if (!isBlocking) {
      if (window.confirm('Do you want to go back ?')) {
        setIsBlocking(true);
        window.location.href = '/';
      } else {
        window.history.pushState(null, '', window.location.pathname);
        setIsBlocking(false);
      }
    }
  };

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
    window.addEventListener('beforeunload', onUnload, {capture: true});

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', onBackButtonEvent);

    if (client) {
      proses();
    }

    return () => {
      window.removeEventListener('popstate', onBackButtonEvent);
    };
  }, [client]);

  const changeAudioPause = (pause: boolean) => {
    audioTrack.enabled = !pause;
    setAudioPause(pause);
  };

  const changeVideoPause = (pause: boolean) => {
    webcamTrack.enabled = !pause;
    setVideoPause(pause);
  };

  async function startCapture(
    displayMediaOptions: DisplayMediaStreamConstraints,
  ): Promise<MediaStream | null> {
    let captureStream: MediaStream | null = null;

    try {
      captureStream = await navigator.mediaDevices.getDisplayMedia(
        displayMediaOptions,
      );
    } catch (err) {
      console.error('Error: ', err);
    }
    return captureStream;
  }

  function stopCapture() {
    screenShareTrack.stop();
    videomain.current.srcObject = localStream;

    const owner = store.getState().message.owner;
    client?.send(
      JSON.stringify({
        method: 'closeScreenShare',
        data: {
          participantName: owner.name,
        },
      }),
    );
  }

  function addStreamStopListener(stream: MediaStream, callback: () => void) {
    stream.addEventListener(
      'ended',
      function () {
        callback();
      },
      false,
    );
    stream.addEventListener(
      'inactive',
      function () {
        callback();
      },
      false,
    );
    stream.getTracks().forEach(function (track) {
      track.addEventListener(
        'ended',
        function () {
          callback();
        },
        false,
      );
      track.addEventListener(
        'inactive',
        function () {
          callback();
        },
        false,
      );
    });
  }

  const changeScreenShare = async (start: boolean) => {
    if (start) {
      const captureStream = await startCapture({
        video: true,
      });
      if (captureStream) {
        screenShareStream = captureStream;
        screenShareTrack = screenShareStream.getVideoTracks()[0];
        await sendTransport?.produce({
          track: screenShareTrack,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          codec: device.rtpCapabilities.codecs!.find(
            codec => codec.mimeType.toLowerCase() === 'video/vp8',
          ),
          appData: {type: 'screen_share'},
        });

        addStreamStopListener(captureStream, function () {
          const owner = store.getState().message.owner;
          client?.send(
            JSON.stringify({
              method: 'closeScreenShare',
              data: {
                participantName: owner.name,
              },
            }),
          );
        });

        setScreenShare(start);
      }
    } else {
      stopCapture();
      setScreenShare(start);
    }
  };

  return (
    <div className="flex flex-col justify-between h-screen relative">
      <div className="absolute bottom-0 left-0 bg-orange-700 z-20 ml-4 mb-8 rounded-lg">
        <div className="flex flex-col p-1">
          <div
            onClick={() => changeScreenShare(true)}
            className={classNames(
              {hidden: screenShare},
              'text-white p-2 hover:bg-orange-600 cursor-pointer',
            )}
          >
            <MdScreenShare />
          </div>
          <div
            onClick={() => changeScreenShare(false)}
            className={classNames(
              {hidden: !screenShare},
              'text-white p-2 hover:bg-orange-600 cursor-pointer',
            )}
          >
            <MdStopScreenShare />
          </div>
          <div
            onClick={() => changeVideoPause(true)}
            className={classNames(
              {hidden: videoPause},
              'text-white p-2 hover:bg-orange-600 cursor-pointer',
            )}
          >
            <FaVideo />
          </div>
          <div
            onClick={() => changeVideoPause(false)}
            className={classNames(
              {hidden: !videoPause},
              'text-white p-2 hover:bg-orange-600 cursor-pointer',
            )}
          >
            <FaVideoSlash />
          </div>
          <div
            onClick={() => changeAudioPause(true)}
            className={classNames(
              {hidden: audioPause},
              'text-white p-2 hover:bg-orange-600 cursor-pointer',
            )}
          >
            <FaMicrophone />
          </div>
          <div
            onClick={() => changeAudioPause(false)}
            className={classNames(
              {hidden: !audioPause},
              'text-white p-2 hover:bg-orange-600 cursor-pointer',
            )}
          >
            <FaMicrophoneSlash />
          </div>
        </div>
      </div>

      <div className="flex flex-col h-full">
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
