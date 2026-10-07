/* Аватарки людей: одни и те же лица в кружках лайков
   и в значке «недавно смотрели профиль». */

export const AVATARS = [
  require('../../assets/likers/a01.jpg'),
  require('../../assets/likers/a02.jpg'),
  require('../../assets/likers/a03.jpg'),
  require('../../assets/likers/a04.jpg'),
  require('../../assets/likers/a05.jpg'),
  require('../../assets/likers/a06.jpg'),
  require('../../assets/likers/a07.jpg'),
  require('../../assets/likers/a08.jpg'),
  require('../../assets/likers/a09.jpg'),
  require('../../assets/likers/a10.jpg'),
  require('../../assets/likers/a11.jpg'),
  require('../../assets/likers/a12.jpg'),
  require('../../assets/likers/a13.jpg'),
  require('../../assets/likers/a14.jpg'),
  require('../../assets/likers/a15.jpg'),
];

export const randomAvatar = () => AVATARS[Math.floor(Math.random() * AVATARS.length)];
