import React, {useState} from 'react';
import {Button, Input} from '../components';
import {useNavigate} from 'react-router-dom';
import Joi from 'joi';
import {useDispatch} from 'react-redux';
import {updateOwner} from '../lib/messageSlice';

export function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: {
      value: '',
      error: false,
      errorText: '',
    },
  });

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
    };
    const val = {name: form.name.value};
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

      navigate('/meeting/meeting', {
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

  return (
    <div className="flex flex-col p-4">
      <div className="flex flex-row justify-center border-b pb-4">
        <div>WEBMEET</div>
      </div>

      <div className="flex flex-row h-64 items-center justify-center p-4">
        <div className="flex flex-col items-center w-1/2 p-4">
          <div className="text-4xl mb-8 text-center">
            Video Meetings for everyone
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
  );
}
