
// Components...........
import AddPost from "../../components/addPost/AddPost"
import Feeds from "../../components/feeds/Feeds"
import UserProfile from "../../components/userProfile/UserProfile"
export default function Profile (){
  return (
    <>
    <UserProfile />
    <AddPost/>
    <Feeds />
    </>
  )
}
