import React, {useState, useEffect} from 'react';
import {Button, Input, Badge} from '../components';
import {useNavigate} from 'react-router-dom';
import Joi from 'joi';
import {useDispatch} from 'react-redux';
import {updateOwner} from '../lib/messageSlice';
import superagent from 'superagent';
import classNames from 'classnames';

interface RoomList {
  name: string;
  jumlah: number;
}

export interface ResultRooms {
  method: number;
  data: Array<RoomList>;
}

export function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<Array<RoomList>>([]);
  const [form, setForm] = useState({
    name: {
      value: '',
      error: false,
      errorText: '',
    },
    room: {
      value: '',
      error: false,
      errorText: '',
    },
  });

  const getData = () => {
    superagent
      .get('/api/getrooms')
      .then(res => {
        const body = res.body as ResultRooms;
        const arr = body.data;
        setRooms(arr);
      })
      .catch(err => {
        console.error(err);
      });
  };

  useEffect(() => {
    getData();
  }, []);

  const onNameChange = (name: string, value: string) => {
    setLoading(false);

    const rule = {
      name: Joi.string().min(4).required(),
    };
    const val = {name: value};
    const validation = Joi.object(rule).validate(val);
    if (validation.error === undefined) {
      interface ValJoi {
        [key: string]: string;
      }
      const value = validation.value as ValJoi;
      const nm: string = value.name;
      setForm(prevState => ({
        ...prevState,
        name: {
          ...prevState.name,
          value: nm,
          error: false,
          errorText: '',
        },
      }));
    } else {
      setForm(prevState => ({
        ...prevState,
        name: {
          ...prevState.name,
          value: value,
          error: true,
          errorText: validation.error.details[0].message,
        },
      }));
    }
  };

  const onClickStart = () => {
    setLoading(false);

    const rule = {
      name: Joi.string().min(4).required(),
      room: Joi.string().min(4).required(),
    };
    const val = {name: form.name.value, room: form.room.value};
    const validation = Joi.object(rule).validate(val);
    if (validation.error === undefined) {
      interface ValJoi {
        [key: string]: string;
      }
      const value = validation.value as ValJoi;
      const nm = value.name;
      setForm(prevState => ({
        ...prevState,
        name: {
          ...prevState.name,
          value: nm,
          error: false,
          errorText: '',
        },
      }));

      dispatch(
        updateOwner({
          name: nm,
        }),
      );

      navigate(`/meeting/${form.room.value}`, {
        state: {
          participantName: nm,
        },
      });
    } else {
      setForm(prevState => ({
        ...prevState,
        name: {
          ...prevState.name,
          error: true,
          errorText: validation.error.details[0].message,
        },
      }));
    }
  };

  const onClickRoom = (rm: string) => {
    setForm(prevState => ({
      ...prevState,
      room: {
        ...prevState.room,
        value: rm,
        error: false,
        errorText: '',
      },
    }));
  };

  return (
    <div className="flex flex-col p-4">
      <div className="flex flex-row border-b pb-4">
        <div>SIMPLE WEB MEET</div>
      </div>

      <div className="flex flex-row">
        <div className="flex flex-col border-r w-64">
          <div className="flex flex-col p-2 border-b">
            <div>Room Available</div>
            <div className="text-xs text-gray-400 mt-1">Please Select</div>
          </div>
          <div className="flex flex-col">
            {rooms.map((room, idx) => {
              return (
                <div
                  key={idx}
                  onClick={() => onClickRoom(room.name)}
                  className={classNames(
                    {'bg-gray-100': form.room.value == room.name},
                    'p-2 hover:bg-gray-100 text-sm flex flex-row justify-between cursor-pointer border-b',
                  )}
                >
                  <div>{room.name}</div>
                  <Badge className="" title={`${room.jumlah}`} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center w-full p-4">
          <div className="flex flex-col items-center w-1/2 p-4">
            <div className="text-4xl mb-8 text-center">Video Meetings</div>
            <div className="flex flex-col justify-start w-64 border-b mb-2">
              <div className="text-xs">room :</div>
              <div className="text-gray-600">
                {form.room.value ? form.room.value : 'Please Select Room'}
              </div>
            </div>
            <Input
              name="name"
              title="name"
              type="text"
              value={form.name.value}
              error={form.name.error}
              errorText={form.name.errorText}
              onChange={onNameChange}
              placeholder="your name"
              disable={loading}
            />
            <Button
              className="mt-4"
              title="START A MEETING"
              onClick={onClickStart}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
