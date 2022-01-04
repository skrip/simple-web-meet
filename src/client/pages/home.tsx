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
    <div className="flex flex-col p-4 dark:bg-gray-900 dark:text-white h-screen">
      <div className="flex flex-row justify-center border-b dark:border-gray-600 pb-4">
        <div className="lg:text-lg text-6xl lg:m-0 m-4">SIMPLE WEB MEET</div>
      </div>

      <div className="flex lg:flex-row flex-col h-full lg:mb-1 mb-8 lg:mt-1 mt-8">
        <div className="flex flex-col border-r dark:border-gray-600 lg:w-64 w-full lg:p-1 p-8">
          <div className="flex flex-col p-2 lg:text-xs text-2xl  border-b dark:border-gray-600">
            <div className="lg:text-lg text-5xl">Room Available</div>
            <div className="lg:text-xs text-4xl text-gray-400 dark:text-gray-100 mt-1">Please Select</div>
          </div>
          <div className="flex flex-col">
            {rooms.map((room, idx) => {
              return (
                <div
                  key={idx}
                  onClick={() => onClickRoom(room.name)}
                  className={classNames(
                    {'bg-gray-100 dark:bg-gray-500': form.room.value == room.name},
                    'lg:p-2 p-4 lg:m-0 m-4 hover:bg-gray-100 dark:hover:bg-gray-500 flex flex-row justify-between cursor-pointer border-b dark:border-gray-600',
                  )}
                >
                  <div className="lg:text-base text-5xl">{room.name}</div>
                  <Badge className="" title={`${room.jumlah}`} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center w-full p-4 lg:mt-0 mt-8">
          <div className="flex flex-col items-center ld:w-1/2 w-full p-4">
            <div className="lg:text-3xl text-6xl mb-8 text-center">Video Meetings</div>
            <div className="flex flex-col justify-start lg:w-64 w-full border-b mb-2">
              <div className="lg:text-xs text-5xl">room :</div>
              <div className="lg:mt-1 mt-8 lg:mb-1 mb-4 lg:text-base text-5xl dark:text-gray-100 text-gray-600">
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
